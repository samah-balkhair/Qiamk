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
import { MergeSortComparator, generateAllPairs, type ValueItem } from "@/lib/mergeSort";

export default function CompareValues() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get("session");

  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [definitions, setDefinitions] = useState<Record<string, string>>({});
  const [comparator, setComparator] = useState<MergeSortComparator | null>(null);
  const [allPairs, setAllPairs] = useState<Array<{ value1: ValueItem; value2: ValueItem }>>([]);

  const { data: selectedValues, isLoading } = trpc.values.getSelected.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );

  const updateDefinitionMutation = trpc.values.updateDefinition.useMutation();
  const addComparisonMutation = trpc.comparisons.add.useMutation();
  const updateScoreMutation = trpc.values.updateScore.useMutation();

  // Initialize comparator and pairs when values are loaded
  useEffect(() => {
    if (selectedValues && selectedValues.length > 0) {
      const values: ValueItem[] = selectedValues.map(sv => ({
        id: sv.id,
        name: sv.valueName || "",
        definition: sv.definition,
      }));

      const comp = new MergeSortComparator(values);
      const pairs = generateAllPairs(values);
      
      setComparator(comp);
      setAllPairs(pairs);

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

  const currentPair = useMemo(() => {
    if (!allPairs || currentPairIndex >= allPairs.length) return null;
    return allPairs[currentPairIndex];
  }, [allPairs, currentPairIndex]);

  const progress = useMemo(() => {
    if (!allPairs || allPairs.length === 0) return 0;
    return (currentPairIndex / allPairs.length) * 100;
  }, [allPairs, currentPairIndex]);

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
    if (!currentPair || !comparator || !sessionId) return;

    try {
      // Record choice in comparator
      comparator.recordChoice(currentPair.value1.id, currentPair.value2.id, selectedValueId);

      // Save comparison to database
      await addComparisonMutation.mutateAsync({
        sessionId,
        value1Id: currentPair.value1.id,
        value2Id: currentPair.value2.id,
        selectedValueId,
        round: currentPairIndex + 1,
      });

      // Move to next comparison
      if (currentPairIndex < allPairs.length - 1) {
        setCurrentPairIndex(prev => prev + 1);
      } else {
        // Check if we need tie-break comparisons
        if (comparator.shouldContinue()) {
          const tieBreakPairs = comparator.getTieBreakPairs();
          if (tieBreakPairs.length > 0) {
            setAllPairs(prev => [...prev, ...tieBreakPairs]);
            toast.info("يوجد تعادل، سنحتاج لمزيد من المقارنات");
            setCurrentPairIndex(prev => prev + 1);
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

  if (!currentPair) {
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
                <span>المقارنة {currentPairIndex + 1} من {allPairs.length}</span>
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
              onClick={() => handleChoice(currentPair.value1.id)}
            >
              <CardHeader>
                <CardTitle className="text-2xl text-center">
                  {currentPair.value1.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>تعريف القيمة (اختياري)</Label>
                  <Textarea
                    placeholder="كيف تعرّف هذه القيمة بالنسبة لك؟"
                    value={definitions[currentPair.value1.id] || ""}
                    onChange={(e) => handleDefinitionChange(currentPair.value1.id, e.target.value)}
                    onBlur={() => handleDefinitionBlur(currentPair.value1.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="min-h-[100px]"
                  />
                </div>
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChoice(currentPair.value1.id);
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
              onClick={() => handleChoice(currentPair.value2.id)}
            >
              <CardHeader>
                <CardTitle className="text-2xl text-center">
                  {currentPair.value2.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>تعريف القيمة (اختياري)</Label>
                  <Textarea
                    placeholder="كيف تعرّف هذه القيمة بالنسبة لك؟"
                    value={definitions[currentPair.value2.id] || ""}
                    onChange={(e) => handleDefinitionChange(currentPair.value2.id, e.target.value)}
                    onBlur={() => handleDefinitionBlur(currentPair.value2.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="min-h-[100px]"
                  />
                </div>
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChoice(currentPair.value2.id);
                  }}
                  disabled={addComparisonMutation.isPending}
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

