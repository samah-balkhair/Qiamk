import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Footer from "@/components/Footer";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle2, Circle } from "lucide-react";

export default function DefineValues() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get("session");

  const [definitions, setDefinitions] = useState<Record<string, string>>({});

  const { data: topValues, isLoading } = trpc.values.getTopValues.useQuery(
    { sessionId: sessionId!, limit: 10 },
    { enabled: !!sessionId }
  );

  const updateDefinitionMutation = trpc.values.updateDefinition.useMutation();

  // Initialize definitions from database
  useEffect(() => {
    if (topValues) {
      const defs: Record<string, string> = {};
      topValues.forEach(tv => {
        if (tv.definition) {
          defs[tv.id] = tv.definition;
        }
      });
      setDefinitions(defs);
    }
  }, [topValues]);

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

  const allDefined = topValues?.every(tv => definitions[tv.id]?.trim());

  const handleContinue = async () => {
    if (!allDefined) {
      toast.error("الرجاء تعريف جميع القيم قبل المتابعة");
      return;
    }

    // Save all definitions
    try {
      for (const tv of topValues!) {
        if (definitions[tv.id]) {
          await updateDefinitionMutation.mutateAsync({
            id: tv.id,
            definition: definitions[tv.id],
          });
        }
      }

      toast.success("تم حفظ جميع التعريفات!");
      setLocation(`/scenarios?session=${sessionId}`);
    } catch (error) {
      toast.error("حدث خطأ أثناء حفظ التعريفات");
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

  const definedCount = topValues?.filter(tv => definitions[tv.id]?.trim()).length || 0;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <main className="flex-1 container py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-slate-900">عرّف قيمك العشرة</h1>
            <p className="text-lg text-slate-600">
              اكتب تعريفاً شخصياً لكل قيمة من قيمك العشرة الأوائل
            </p>
            <Badge variant={allDefined ? "default" : "secondary"} className="text-base px-4 py-1">
              {allDefined ? "✓ جميع القيم معرّفة" : `${definedCount} من 10 معرّفة`}
            </Badge>
          </div>

          {/* Values List */}
          <div className="space-y-4">
            {topValues?.map((tv, index) => {
              const isDefined = !!definitions[tv.id]?.trim();
              
              return (
                <Card key={tv.id} className={isDefined ? "border-green-300 bg-green-50/50" : ""}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      {isDefined ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : (
                        <Circle className="h-6 w-6 text-slate-400" />
                      )}
                      <span className="text-slate-600 text-base">#{index + 1}</span>
                      <span className="text-xl">{tv.valueName}</span>
                      <Badge variant="outline" className="mr-auto">
                        {tv.initialScore} نقطة
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label htmlFor={`definition-${tv.id}`}>
                        تعريف القيمة <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id={`definition-${tv.id}`}
                        placeholder="ماذا تعني هذه القيمة بالنسبة لك؟ كيف تعرّفها بأسلوبك الخاص؟"
                        value={definitions[tv.id] || ""}
                        onChange={(e) => handleDefinitionChange(tv.id, e.target.value)}
                        onBlur={() => handleDefinitionBlur(tv.id)}
                        className="min-h-[120px]"
                        required
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-4 pt-6">
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.history.back()}
            >
              العودة
            </Button>
            <Button
              size="lg"
              onClick={handleContinue}
              disabled={!allDefined || updateDefinitionMutation.isPending}
            >
              {updateDefinitionMutation.isPending ? "جاري الحفظ..." : "المتابعة إلى السيناريوهات"}
            </Button>
          </div>

          {/* Info */}
          {!allDefined && (
            <div className="text-center text-sm text-amber-600 bg-amber-50 p-4 rounded-lg border border-amber-200">
              <p>⚠️ يجب تعريف جميع القيم العشرة قبل المتابعة إلى مرحلة السيناريوهات</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

