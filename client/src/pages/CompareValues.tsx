import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import Footer from "@/components/Footer";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { MergeSortComparator, type Comparison } from "@/lib/mergeSort";

export default function CompareValues() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get("session");

  const [currentComparisonIndex, setCurrentComparisonIndex] = useState(0);
  const [definitions, setDefinitions] = useState<Record<string, string>>({});
  const [comparator, setComparator] = useState<MergeSortComparator | null>(null);
  const [comparisons, setComparisons] = useState<Comparison[]>([]);

  const { data: selectedValues, isLoading } = trpc.values.getSelected.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );

  const updateDefinitionMutation = trpc.values.updateDefinition.useMutation();
  const addComparisonMutation = trpc.comparisons.add.useMutation();
  const updateScoreMutation = trpc.values.updateScore.useMutation();

  // Initialize comparator when values are loaded
  useEffect(() => {
    if (selectedValues && selectedValues.length > 0) {
      const values = selectedValues.map(sv => ({
        id: sv.id,
        name: sv.valueName || "",
        definition: sv.definition,
      }));

      const comp = new MergeSortComparator(values);
      const generatedComparisons = comp.generateComparisons();
      
      setComparator(comp);
      setComparisons(generatedComparisons);

      // Initialize definitions from database
      const defs: Record<string, string> = {};
      selectedValues.forEach(sv => {
        if (sv.definition) {
          defs[sv.id] = sv.definition;
        }
      });
      setDefinitions(defs);
    }
  }, [selectedValues]);

  const currentComparison = useMemo(() => {
    if (!comparisons || currentComparisonIndex >= comparisons.length) return null;
    return comparisons[currentComparisonIndex];
  }, [comparisons, currentComparisonIndex]);

  const progress = useMemo(() => {
    if (!comparisons || comparisons.length === 0) return 0;
    return (currentComparisonIndex / comparisons.length) * 100;
  }, [comparisons, currentComparisonIndex]);

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
    if (!currentComparison || !comparator || !sessionId) return;

    try {
      // Record choice in comparator
      comparator.recordChoice(currentComparisonIndex, selectedValueId);

      // Save comparison to database
      await addComparisonMutation.mutateAsync({
        sessionId,
        value1Id: currentComparison.value1.id,
        value2Id: currentComparison.value2.id,
        selectedValueId,
        round: currentComparison.round,
      });

      // Move to next comparison
      if (currentComparisonIndex < comparisons.length - 1) {
        setCurrentComparisonIndex(prev => prev + 1);
      } else {
        // Check if we need tie-break comparisons
        if (comparator.shouldContinue()) {
          const tieBreakComparisons = comparator.generateTieBreakComparisons();
          if (tieBreakComparisons.length > 0) {
            setComparisons(prev => [...prev, ...tieBreakComparisons]);
            toast.info("يوجد تعادل، سنحتاج لمزيد من المقارنات");
            setCurrentComparisonIndex(prev => prev + 1);
            return;
          }
        }

        // Save scores to database
        const scores = comparator.getScores();
        const scoresArray = Array.from(scores.entries());
        for (const [valueId, score] of scoresArray) {
          await updateScoreMutation.mutateAsync({
            id: valueId,
            score,
            type: "initial",
          });
        }

        // Move to define values page
        toast.success("تم الانتهاء من المفاضلة!");
        setLocation(`/define-values?session=${sessionId}`);
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

  if (!currentComparison) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">لا توجد مقارنات متاحة</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <main className="flex-1 container py-12">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-slate-900">المفاضلة بين القيم</h1>
            <p className="text-lg text-slate-600">
              اختر القيمة الأهم بالنسبة لك في كل مقارنة
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>المقارنة {currentComparisonIndex + 1} من {comparisons.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
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
                >
                  اختر هذه القيمة
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Info */}
          <div className="text-center text-sm text-slate-600">
            <p>💡 يمكنك إضافة تعريف للقيمة الآن أو لاحقاً. التعريف سيظهر في كل مرة تظهر فيها القيمة.</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

