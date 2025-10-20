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
import { InteractiveMergeSort, type ValueItem, calculateExpectedComparisons } from "@/lib/mergeSort";

export default function CompareValues() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get("session");

  const [definitions, setDefinitions] = useState<Record<string, string>>({});
  const [sorter, setSorter] = useState<InteractiveMergeSort | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render

  const { data: selectedValues, isLoading } = trpc.values.getSelected.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );

  const updateDefinitionMutation = trpc.values.updateDefinition.useMutation();
  const addComparisonMutation = trpc.comparisons.add.useMutation();
  const updateScoreMutation = trpc.values.updateScore.useMutation();

  // Initialize sorter when values are loaded
  useEffect(() => {
    if (selectedValues && selectedValues.length > 0 && !sorter) {
      const values: ValueItem[] = selectedValues.map(sv => ({
        id: sv.id,
        name: sv.valueName || "",
        definition: sv.definition,
      }));

      const mergeSorter = new InteractiveMergeSort(values);
      setSorter(mergeSorter);

      // Initialize definitions from database
      const defs: Record<string, string> = {};
      selectedValues.forEach(sv => {
        if (sv.definition) {
          defs[sv.id] = sv.definition;
        }
      });
      setDefinitions(defs);

      // Log expected comparisons
      const expected = calculateExpectedComparisons(values.length);
      console.log(`Expected comparisons: ${expected} for ${values.length} values`);
      console.log(`Actual comparisons: ${mergeSorter.getTotalComparisons()}`);
    }
  }, [selectedValues, sorter]);

  const currentComparison = useMemo(() => {
    if (!sorter) return null;
    return sorter.getCurrentComparison();
  }, [sorter, refreshKey]);

  const progress = useMemo(() => {
    if (!sorter) return 0;
    const total = sorter.getTotalComparisons();
    const current = sorter.getCurrentIndex();
    return total > 0 ? (current / total) * 100 : 0;
  }, [sorter, refreshKey]);

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
    if (!currentComparison || !sorter || !sessionId) return;

    try {
      // Record choice in sorter
      sorter.recordChoice(
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
        round: sorter.getCurrentIndex(),
      });

      // Check if we're done
      if (sorter.isComplete()) {
        // Save scores to database
        const scores = sorter.getScores();
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

  if (!sorter || !currentComparison) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">جاري التحضير...</p>
      </div>
    );
  }

  const totalComparisons = sorter.getTotalComparisons();
  const currentIndex = sorter.getCurrentIndex();

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
                <span>المقارنة {currentIndex + 1} من {totalComparisons}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-slate-500">
                خوارزمية Merge Sort تقلل المقارنات من {Math.round((selectedValues?.length || 0) * ((selectedValues?.length || 0) - 1) / 2)} إلى {totalComparisons} فقط
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
          <div className="text-center text-sm text-slate-600">
            <p>💡 يمكنك إضافة تعريف للقيمة الآن أو لاحقاً. التعريف سيظهر في كل مرة تظهر فيها القيمة.</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

