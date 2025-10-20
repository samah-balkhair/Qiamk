import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Footer from "@/components/Footer";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Plus } from "lucide-react";

export default function SelectValues() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get("session");

  const [selectedValueIds, setSelectedValueIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [newValueName, setNewValueName] = useState("");

  const { data: allValues, refetch: refetchValues } = trpc.values.getAll.useQuery();
  const addValueMutation = trpc.values.add.useMutation();
  const selectValuesMutation = trpc.values.selectValues.useMutation();

  const filteredValues = useMemo(() => {
    if (!allValues) return [];
    if (!searchTerm) return allValues;
    return allValues.filter(v => v.name.includes(searchTerm));
  }, [allValues, searchTerm]);

  const handleToggleValue = (valueId: string) => {
    setSelectedValueIds(prev => {
      if (prev.includes(valueId)) {
        return prev.filter(id => id !== valueId);
      } else {
        if (prev.length >= 50) {
          toast.error("لا يمكن اختيار أكثر من 50 قيمة");
          return prev;
        }
        return [...prev, valueId];
      }
    });
  };

  const handleAddCustomValue = async () => {
    if (!newValueName.trim()) {
      toast.error("الرجاء إدخال اسم القيمة");
      return;
    }

    try {
      const newValue = await addValueMutation.mutateAsync({ name: newValueName.trim() });
      toast.success("تمت إضافة القيمة بنجاح");
      setNewValueName("");
      await refetchValues();
      
      // Auto-select the new value
      setSelectedValueIds(prev => [...prev, newValue.id]);
    } catch (error) {
      toast.error("حدث خطأ أثناء إضافة القيمة");
    }
  };

  const handleContinue = async () => {
    if (selectedValueIds.length < 5) {
      toast.error("الرجاء اختيار 5 قيم على الأقل");
      return;
    }

    if (!sessionId) {
      toast.error("معرف الجلسة غير موجود");
      return;
    }

    try {
      await selectValuesMutation.mutateAsync({
        sessionId,
        valueIds: selectedValueIds,
      });

      // If more than 10 values, go to comparison page
      if (selectedValueIds.length > 10) {
        setLocation(`/compare-values?session=${sessionId}`);
      } else {
        // Otherwise, go directly to define values page
        setLocation(`/define-values?session=${sessionId}`);
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء حفظ القيم");
    }
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-red-600">معرف الجلسة غير موجود</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <main className="flex-1 container py-12">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-slate-900">اختر قيمك</h1>
            <p className="text-lg text-slate-600">
              اختر من 5 إلى 50 قيمة تعبر عنك، أو أضف قيمك الخاصة
            </p>
            <div className="flex justify-center gap-4 items-center">
              <Badge variant={selectedValueIds.length < 5 ? "destructive" : "default"} className="text-base px-4 py-1">
                القيم المختارة: {selectedValueIds.length}
              </Badge>
              {selectedValueIds.length >= 5 && selectedValueIds.length <= 50 && (
                <Badge variant="outline" className="text-base px-4 py-1 bg-green-50 text-green-700 border-green-300">
                  ✓ جاهز للمتابعة
                </Badge>
              )}
            </div>
          </div>

          {/* Search and Add Custom Value */}
          <Card>
            <CardHeader>
              <CardTitle>البحث وإضافة قيم جديدة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="ابحث عن قيمة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="أضف قيمة جديدة..."
                  value={newValueName}
                  onChange={(e) => setNewValueName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCustomValue()}
                />
                <Button 
                  onClick={handleAddCustomValue}
                  disabled={addValueMutation.isPending}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Values Grid */}
          <Card>
            <CardHeader>
              <CardTitle>القيم المتاحة ({filteredValues?.length || 0})</CardTitle>
              <CardDescription>
                اضغط على القيمة لاختيارها أو إلغاء اختيارها
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto">
                {filteredValues?.map((value) => {
                  const isSelected = selectedValueIds.includes(value.id);
                  return (
                    <div
                      key={value.id}
                      className={`
                        flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all
                        ${isSelected 
                          ? "border-blue-500 bg-blue-50" 
                          : "border-slate-200 bg-white hover:border-slate-300"
                        }
                      `}
                      onClick={() => handleToggleValue(value.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleValue(value.id)}
                      />
                      <Label className="cursor-pointer flex-1">
                        {value.name}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setLocation("/")}
            >
              العودة
            </Button>
            <Button
              size="lg"
              onClick={handleContinue}
              disabled={selectedValueIds.length < 5 || selectedValueIds.length > 50 || selectValuesMutation.isPending}
            >
              {selectValuesMutation.isPending ? "جاري الحفظ..." : "المتابعة"}
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

