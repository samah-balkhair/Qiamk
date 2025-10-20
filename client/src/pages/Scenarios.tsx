import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Footer from "@/components/Footer";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ScenarioPair {
  value1: { id: string; name: string; definition: string };
  value2: { id: string; name: string; definition: string };
}

export default function Scenarios() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get("session");

  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [scenarioPairs, setScenarioPairs] = useState<ScenarioPair[]>([]);
  const [currentScenarioText, setCurrentScenarioText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [finalScores, setFinalScores] = useState<Record<string, number>>({});

  const { data: topValues } = trpc.values.getTopValues.useQuery(
    { sessionId: sessionId!, limit: 10 },
    { enabled: !!sessionId }
  );

  const addScenarioMutation = trpc.scenarios.add.useMutation();
  const updateChoiceMutation = trpc.scenarios.updateChoice.useMutation();
  const updateScoreMutation = trpc.values.updateScore.useMutation();

  // Generate all scenario pairs (45 combinations)
  useEffect(() => {
    if (topValues && topValues.length === 10) {
      const pairs: ScenarioPair[] = [];
      for (let i = 0; i < topValues.length; i++) {
        for (let j = i + 1; j < topValues.length; j++) {
          pairs.push({
            value1: {
              id: topValues[i].id,
              name: topValues[i].valueName || "",
              definition: topValues[i].definition || "",
            },
            value2: {
              id: topValues[j].id,
              name: topValues[j].valueName || "",
              definition: topValues[j].definition || "",
            },
          });
        }
      }
      setScenarioPairs(pairs);

      // Initialize scores
      const scores: Record<string, number> = {};
      topValues.forEach(tv => {
        scores[tv.id] = 0;
      });
      setFinalScores(scores);
    }
  }, [topValues]);

  const currentPair = useMemo(() => {
    if (!scenarioPairs || currentScenarioIndex >= scenarioPairs.length) return null;
    return scenarioPairs[currentScenarioIndex];
  }, [scenarioPairs, currentScenarioIndex]);

  const progress = useMemo(() => {
    if (!scenarioPairs || scenarioPairs.length === 0) return 0;
    return (currentScenarioIndex / scenarioPairs.length) * 100;
  }, [scenarioPairs, currentScenarioIndex]);

  // Generate scenario when pair changes
  useEffect(() => {
    if (currentPair && sessionId) {
      generateScenario();
    }
  }, [currentPair]);

  const generateScenario = async () => {
    if (!currentPair || !sessionId) return;

    setIsGenerating(true);
    setCurrentScenarioText("");

    try {
      const response = await fetch("/api/generate-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value1Name: currentPair.value1.name,
          value1Definition: currentPair.value1.definition,
          value2Name: currentPair.value2.name,
          value2Definition: currentPair.value2.definition,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate scenario");
      }

      const data = await response.json();
      setCurrentScenarioText(data.scenario);

      // Save scenario to database
      const scenario = await addScenarioMutation.mutateAsync({
        sessionId,
        value1Id: currentPair.value1.id,
        value1Definition: currentPair.value1.definition,
        value2Id: currentPair.value2.id,
        value2Definition: currentPair.value2.definition,
        scenarioText: data.scenario,
      });

      setScenarioId(scenario.id);
    } catch (error) {
      console.error("Failed to generate scenario:", error);
      toast.error("حدث خطأ أثناء إنشاء السيناريو");
      setCurrentScenarioText("عذراً، حدث خطأ أثناء إنشاء السيناريو. الرجاء المحاولة مرة أخرى.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChoice = async (selectedValueId: string) => {
    if (!scenarioId || !sessionId) return;

    try {
      // Update scenario choice
      await updateChoiceMutation.mutateAsync({
        id: scenarioId,
        selectedValueId,
      });

      // Update final score
      setFinalScores(prev => ({
        ...prev,
        [selectedValueId]: (prev[selectedValueId] || 0) + 1,
      }));

      // Move to next scenario
      if (currentScenarioIndex < scenarioPairs.length - 1) {
        setCurrentScenarioIndex(prev => prev + 1);
        setScenarioId(null);
      } else {
        // Save final scores to database
        const scoresEntries = Object.entries(finalScores);
        for (const [valueId, score] of scoresEntries) {
          await updateScoreMutation.mutateAsync({
            id: valueId,
            score: score + (selectedValueId === valueId ? 1 : 0),
            type: "final",
          });
        }

        toast.success("تم الانتهاء من جميع السيناريوهات!");
        setLocation(`/results?session=${sessionId}`);
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء حفظ الاختيار");
      console.error(error);
    }
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-red-600">معرف الجلسة غير موجود</p>
      </div>
    );
  }

  if (!currentPair) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <main className="flex-1 container py-12">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-slate-900">السيناريوهات المتطرفة</h1>
            <p className="text-lg text-slate-600">
              اقرأ السيناريو واختر القيمة الأهم بالنسبة لك
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>السيناريو {currentScenarioIndex + 1} من {scenarioPairs.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>

          {/* Values Being Compared */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-2 border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="text-xl text-center">{currentPair.value1.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 italic">"{currentPair.value1.definition}"</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200 bg-purple-50/50">
              <CardHeader>
                <CardTitle className="text-xl text-center">{currentPair.value2.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 italic">"{currentPair.value2.definition}"</p>
              </CardContent>
            </Card>
          </div>

          {/* Scenario */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isGenerating && <Loader2 className="h-5 w-5 animate-spin" />}
                السيناريو
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
                    <p className="text-slate-600">جاري إنشاء السيناريو بواسطة الذكاء الاصطناعي...</p>
                  </div>
                </div>
              ) : (
                <div className="prose prose-slate max-w-none">
                  <p className="text-lg leading-relaxed whitespace-pre-wrap">{currentScenarioText}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Choice Buttons */}
          {!isGenerating && currentScenarioText && (
            <div className="grid md:grid-cols-2 gap-4">
              <Button
                size="lg"
                className="h-auto py-6 text-lg"
                onClick={() => handleChoice(currentPair.value1.id)}
                disabled={updateChoiceMutation.isPending}
              >
                أختار: {currentPair.value1.name}
              </Button>

              <Button
                size="lg"
                className="h-auto py-6 text-lg"
                onClick={() => handleChoice(currentPair.value2.id)}
                disabled={updateChoiceMutation.isPending}
              >
                أختار: {currentPair.value2.name}
              </Button>
            </div>
          )}

          {/* Current Scores */}
          <Card className="bg-slate-50">
            <CardHeader>
              <CardTitle className="text-base">النقاط الحالية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {topValues?.map(tv => (
                  <Badge key={tv.id} variant="outline" className="text-sm">
                    {tv.valueName}: {finalScores[tv.id] || 0}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}

