import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Footer from "@/components/Footer";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Edit } from "lucide-react";

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
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [scenarioHistory, setScenarioHistory] = useState<Array<{
    index: number;
    scenarioId: string;
    selectedValueId: string | null;
  }>>([]);

  const { data: topValues } = trpc.values.getTopValues.useQuery(
    { sessionId: sessionId!, limit: 10 },
    { enabled: !!sessionId }
  );

  const { data: quotaStatus } = trpc.scenarios.checkQuota.useQuery();
  const addScenarioMutation = trpc.scenarios.add.useMutation();
  const updateChoiceMutation = trpc.scenarios.updateChoice.useMutation();
  const updateScoreMutation = trpc.values.updateScore.useMutation();
  const deleteScenariosMutation = trpc.scenarios.deleteAll.useMutation();

  // Generate all scenario pairs (45 combinations for 10 values, less for fewer)
  useEffect(() => {
    if (topValues && topValues.length >= 5) {
      const pairs: ScenarioPair[] = [];
      
      // Take top 10 values or all available if less than 10
      const valuesToUse = topValues.slice(0, Math.min(10, topValues.length));
      
      for (let i = 0; i < valuesToUse.length; i++) {
        for (let j = i + 1; j < valuesToUse.length; j++) {
          pairs.push({
            value1: {
              id: valuesToUse[i].id,
              name: valuesToUse[i].valueName || "",
              definition: valuesToUse[i].definition || "",
            },
            value2: {
              id: valuesToUse[j].id,
              name: valuesToUse[j].valueName || "",
              definition: valuesToUse[j].definition || "",
            },
          });
        }
      }
      
      setScenarioPairs(pairs);
      console.log(`Generated ${pairs.length} scenario pairs from ${valuesToUse.length} values`);

      // Initialize scores
      const scores: Record<string, number> = {};
      valuesToUse.forEach(tv => {
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
    } catch (error: any) {
      console.error("Failed to generate scenario:", error);
      
      // Check if it's a quota error
      if (error?.message === "QUOTA_EXCEEDED" || error?.data?.message === "QUOTA_EXCEEDED") {
        // Quota exceeded - don't show generic error
        return;
      }
      
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

      // Add to history
      setScenarioHistory(prev => [
        ...prev,
        {
          index: currentScenarioIndex,
          scenarioId: scenarioId,
          selectedValueId: selectedValueId,
        }
      ]);

      // Update final score
      setFinalScores(prev => ({
        ...prev,
        [selectedValueId]: (prev[selectedValueId] || 0) + 1,
      }));

      // Move to next scenario
      if (currentScenarioIndex < scenarioPairs.length - 1) {
        window.scrollTo(0, 0);
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
        window.scrollTo(0, 0);
        setLocation(`/results?session=${sessionId}`);
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء حفظ الاختيار");
      console.error(error);
    }
  };

  const handleGoBack = () => {
    if (currentScenarioIndex > 0) {
      window.scrollTo(0, 0);
      setCurrentScenarioIndex(prev => prev - 1);
      setScenarioId(null);
      
      // Remove last entry from history
      setScenarioHistory(prev => prev.slice(0, -1));
      
      // Adjust scores if there was a previous choice
      const lastHistory = scenarioHistory[scenarioHistory.length - 1];
      if (lastHistory && lastHistory.selectedValueId) {
        setFinalScores(prev => ({
          ...prev,
          [lastHistory.selectedValueId!]: Math.max(0, (prev[lastHistory.selectedValueId!] || 0) - 1),
        }));
      }
    }
  };

  const handleEditDefinitions = () => {
    setShowEditWarning(true);
  };

  const confirmEditDefinitions = async () => {
    if (!sessionId) return;

    try {
      // Delete all scenarios for this session
      await deleteScenariosMutation.mutateAsync({ sessionId });
      
      toast.success("سيتم إعادة توجيهك لتعديل التعريفات");
      window.scrollTo(0, 0);
      setLocation(`/define-values?session=${sessionId}`);
    } catch (error) {
      toast.error("حدث خطأ أثناء مسح السيناريوهات");
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

          {/* Navigation Buttons */}
          <div className="flex gap-3 justify-between">
            <Button
              variant="outline"
              onClick={handleGoBack}
              disabled={currentScenarioIndex === 0 || isGenerating}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              السيناريو السابق
            </Button>
            
            <Button
              variant="outline"
              onClick={handleEditDefinitions}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              تعديل التعريفات
            </Button>
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

          {/* Quota Exceeded Warning */}
          {quotaStatus && !quotaStatus.available && (
            <Card className="border-2 border-yellow-400 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-xl text-yellow-800 flex items-center gap-2">
                  ⚠️ تم استنفاذ رصيد السيناريوهات لهذا اليوم
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-yellow-900 leading-relaxed">
                  نظراً للطلب الكبير، تم الوصول للحد الأقصى من السيناريوهات اليومية ({quotaStatus.limit} سيناريو).
                </p>
                
                <div className="bg-white rounded-lg p-4 space-y-3">
                  <p className="font-semibold text-slate-900">يمكنك:</p>
                  <ul className="list-disc list-inside space-y-2 text-slate-700">
                    <li>العودة غداً لإكمال التمرين (سيتم حفظ تقدمك تلقائياً)</li>
                    <li>التواصل معنا للحصول على أولوية الوصول</li>
                    <li>ترك بريدك الإلكتروني لإشعارك عند توفر الرصيد</li>
                  </ul>
                </div>

                <div className="flex gap-3 flex-wrap">
                  <Button
                    onClick={() => setLocation("/")}
                    variant="default"
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    العودة للصفحة الرئيسية
                  </Button>
                  <Button
                    onClick={() => window.open("https://linktr.ee/samahbalkhair", "_blank")}
                    variant="outline"
                  >
                    التواصل معنا
                  </Button>
                </div>

                <p className="text-sm text-slate-600 italic">
                  💡 تذكر: تقدمك محفوظ بشكل تلقائي. يمكنك العودة في أي وقت لإكمال رحلتك.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Scenario */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isGenerating && <Loader2 className="h-5 w-5 animate-spin ml-2" />}
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

      {/* Edit Definitions Warning Dialog */}
      <AlertDialog open={showEditWarning} onOpenChange={setShowEditWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تحذير: تعديل التعريفات</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                ⚠️ العودة لتعديل التعريفات سيؤدي إلى <strong>مسح جميع السيناريوهات</strong> التي أجبت عليها.
              </p>
              <p>
                سيتم البدء من جديد بسيناريوهات جديدة بعد تعديل التعريفات.
              </p>
              <p className="text-amber-700 font-medium">
                هل أنت متأكد من رغبتك في المتابعة؟
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEditDefinitions} className="bg-red-600 hover:bg-red-700">
              نعم، أريد تعديل التعريفات
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}

