import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Footer from "@/components/Footer";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { EloRatingSystem, type ValueItem, calculateRecommendedComparisons } from "@/lib/eloRating";
import { Zap } from "lucide-react";

export default function CompareValues() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get("session");

  const [definitions, setDefinitions] = useState<Record<string, string>>({});
  const [eloSystem, setEloSystem] = useState<EloRatingSystem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: selectedValues, isLoading } = trpc.values.getSelected.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );

  const updateDefinitionMutation = trpc.values.updateDefinition.useMutation();
  const addComparisonMutation = trpc.comparisons.add.useMutation();
  const updateScoreMutation = trpc.values.updateScore.useMutation();

  // Initialize Elo system when values are loaded
  useEffect(() => {
    if (selectedValues && selectedValues.length > 0 && !eloSystem) {
      const values: ValueItem[] = selectedValues.map(sv => ({
        id: sv.id,
        name: sv.valueName || "",
        definition: sv.definition,
        rating: 1000,
      }));

      const recommended = calculateRecommendedComparisons(values.length);
      const system = new EloRatingSystem(values, recommended);
      setEloSystem(system);

      // Initialize definitions from database
      const defs: Record<string, string> = {};
      selectedValues.forEach(sv => {
        if (sv.definition) {
          defs[sv.id] = sv.definition;
        }
      });
      setDefinitions(defs);

      console.log(`Elo System initialized: ${values.length} values, ${recommended} comparisons`);
    }
  }, [selectedValues, eloSystem]);

  const currentComparison = useMemo(() => {
    if (!eloSystem) return null;
    return eloSystem.getNextComparison();
  }, [eloSystem, refreshKey]);

  const progress = useMemo(() => {
    if (!eloSystem) return { current: 0, total: 0, percentage: 0 };
    return eloSystem.getProgress();
  }, [eloSystem, refreshKey]);

  const isSecondHalf = useMemo(() => {
    return progress.percentage >= 50;
  }, [progress]);

  const handleDefinitionChange = (valueId: string, definition: string) => {
    setDefinitions(prev => ({ ...prev, [valueId]: definition }));
  };

  const handleDefinitionBlur = async (valueId: string) => {
    const definition = definitions[valueId];
    if (definition) {
      try {
        await updateDefinitionMutation.mutateAsync({
          id: valueId,
          definition,
        });
      } catch (error) {
        console.error("Failed to save definition:", error);
      }
    }
  };

  const handleChoice = async (selectedValueId: string) => {
    if (!currentComparison || !eloSystem || !sessionId) return;

    try {
      // Record comparison in Elo system
      eloSystem.recordComparison(
        currentComparison.value1.id,
        currentComparison.value2.id,
        selectedValueId
      );

      // Save comparison to database
      await addComparisonMutation.mutateAsync({
        sessionId,
        value1Id: currentComparison.value1.id,
        value2Id: currentComparison.value2.id,
        selectedValueId,
        round: eloSystem.getCurrentRound(),
      });

      // Check if we're done
      if (eloSystem.isComplete()) {
        // Save ratings to database
        const ratings = eloSystem.getAllRatings();
        const ratingsArray = Array.from(ratings.entries());
        
        for (const [valueId, rating] of ratingsArray) {
          await updateScoreMutation.mutateAsync({
            id: valueId,
            score: rating,
            type: "initial",
          });
        }

        // Move to define values page
        toast.success("تم الانتهاء من المفاضلة!");
        setLocation(`/define-values?session=${sessionId}`);
      } else {
        // Force re-render to show next comparison
        setRefreshKey(prev => prev + 1);
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">جاري التحميل...</p>
      </div>
    );
  }

  if (!eloSystem || !currentComparison) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">جاري التحضير...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <main className="flex-1 container py-12">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Zap className="h-8 w-8 text-yellow-500" />
              <h1 className="text-4xl font-bold text-slate-900">المفاضلة الذكية</h1>
            </div>
            <p className="text-lg text-slate-600">
              اختر القيمة الأهم بالنسبة لك في كل مقارنة
            </p>
            
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>المقارنة {progress.current + 1} من {progress.total}</span>
                <span>{Math.round(progress.percentage)}%</span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
              
              {/* Phase indicator */}
              {isSecondHalf ? (
                <Badge variant="default" className="text-sm">
                  <Zap className="h-3 w-3 ml-1" />
                  المرحلة الثانية: التركيز على القيم الأعلى
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-sm">
                  المرحلة الأولى: المقارنات العشوائية
                </Badge>
              )}
              
              <p className="text-xs text-slate-500">
                نظام Elo Rating الذكي - توفير 70% من المقارنات مع نتائج دقيقة
              </p>
            </div>
          </div>

          {/* Comparison Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Value 1 */}
            <Card 
              className="border-2 hover:border-blue-500 cursor-pointer transition-all hover:shadow-lg"
              onClick={() => handleChoice(currentComparison.value1.id)}
            >
              <CardHeader>
                <CardTitle className="text-2xl text-center">
                  {currentComparison.value1.name}
                </CardTitle>
                <div className="text-center">
                  <Badge variant="outline" className="text-xs">
                    التقييم: {currentComparison.value1.rating}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>تعريف القيمة (اختياري)</Label>
                  <Textarea
                    placeholder="كيف تعرّف هذه القيمة بالنسبة لك؟"
                    value={definitions[currentComparison.value1.id] || ""}
                    onChange={(e) => handleDefinitionChange(currentComparison.value1.id, e.target.value)}
                    onBlur={() => handleDefinitionBlur(currentComparison.value1.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="min-h-[100px]"
                  />
                </div>
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChoice(currentComparison.value1.id);
                  }}
                  disabled={addComparisonMutation.isPending}
                >
                  اختر هذه القيمة
                </Button>
              </CardContent>
            </Card>

            {/* Value 2 */}
            <Card 
              className="border-2 hover:border-blue-500 cursor-pointer transition-all hover:shadow-lg"
              onClick={() => handleChoice(currentComparison.value2.id)}
            >
              <CardHeader>
                <CardTitle className="text-2xl text-center">
                  {currentComparison.value2.name}
                </CardTitle>
                <div className="text-center">
                  <Badge variant="outline" className="text-xs">
                    التقييم: {currentComparison.value2.rating}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>تعريف القيمة (اختياري)</Label>
                  <Textarea
                    placeholder="كيف تعرّف هذه القيمة بالنسبة لك؟"
                    value={definitions[currentComparison.value2.id] || ""}
                    onChange={(e) => handleDefinitionChange(currentComparison.value2.id, e.target.value)}
                    onBlur={() => handleDefinitionBlur(currentComparison.value2.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="min-h-[100px]"
                  />
                </div>
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChoice(currentComparison.value2.id);
                  }}
                  disabled={addComparisonMutation.isPending}
                >
                  اختر هذه القيمة
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Info */}
          <div className="text-center text-sm text-slate-600 space-y-2">
            <p>💡 يمكنك إضافة تعريف للقيمة الآن أو لاحقاً. التعريف سيظهر في كل مرة تظهر فيها القيمة.</p>
            {isSecondHalf && (
              <p className="text-blue-600 font-medium">
                ⚡ الآن نركز على القيم الأعلى تقييماً لتحديد العشرة الأوائل بدقة
              </p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

