import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Footer from "@/components/Footer";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Search, Plus, X } from "lucide-react";

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

  // Filter available values (exclude selected ones)
  const availableValues = useMemo(() => {
    if (!allValues) return [];
    return allValues.filter(v => !selectedValueIds.includes(v.id));
  }, [allValues, selectedValueIds]);

  // Filter by search term
  const filteredAvailableValues = useMemo(() => {
    if (!searchTerm) return availableValues;
    return availableValues.filter(v => v.name.includes(searchTerm));
  }, [availableValues, searchTerm]);

  // Get selected values objects
  const selectedValues = useMemo(() => {
    if (!allValues) return [];
    return selectedValueIds
      .map(id => allValues.find(v => v.id === id))
      .filter(Boolean) as typeof allValues;
  }, [allValues, selectedValueIds]);

  const handleSelectValue = (valueId: string) => {
    if (selectedValueIds.length >= 50) {
      toast.error("لا يمكن اختيار أكثر من 50 قيمة");
      return;
    }
    setSelectedValueIds(prev => [...prev, valueId]);
  };

  const handleRemoveValue = (valueId: string) => {
    setSelectedValueIds(prev => prev.filter(id => id !== valueId));
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
      if (selectedValueIds.length < 50) {
        setSelectedValueIds(prev => [...prev, newValue.id]);
      }
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
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-slate-900">اختر قيمك</h1>
            <p className="text-lg text-slate-600">
              اختر من 5 إلى 50 قيمة تعبر عنك، أو أضف قيمك الخاصة
            </p>
          </div>

          {/* Search and Add Custom Value */}
          <Card>
            <CardHeader>
              <CardTitle>البحث وإضافة قيم جديدة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="ابحث عن قيمة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
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
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Selected Values */}
            <Card className="border-2 border-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>القيم المختارة</span>
                  <Badge 
                    variant={selectedValueIds.length < 5 ? "destructive" : selectedValueIds.length > 50 ? "destructive" : "default"}
                    className="text-base"
                  >
                    {selectedValueIds.length} / 50
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {selectedValueIds.length < 5 
                    ? `اختر ${5 - selectedValueIds.length} قيم على الأقل للمتابعة`
                    : "يمكنك المتابعة أو إضافة المزيد من القيم"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedValues.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <p>لم تختر أي قيم بعد</p>
                    <p className="text-sm mt-2">اختر من القيم المتاحة على اليسار</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-[500px] overflow-y-auto">
                    {selectedValues.map((value) => (
                      <Badge
                        key={value.id}
                        variant="default"
                        className="text-base px-3 py-2 cursor-pointer hover:bg-blue-700 transition-colors"
                      >
                        {value.name}
                        <button
                          onClick={() => handleRemoveValue(value.id)}
                          className="mr-2 hover:text-red-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Available Values */}
            <Card>
              <CardHeader>
                <CardTitle>القيم المتاحة ({filteredAvailableValues?.length || 0})</CardTitle>
                <CardDescription>
                  اضغط على القيمة لاختيارها
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 max-h-[500px] overflow-y-auto">
                  {filteredAvailableValues?.map((value) => (
                    <Badge
                      key={value.id}
                      variant="outline"
                      className="text-base px-3 py-2 cursor-pointer hover:bg-slate-100 hover:border-blue-500 transition-colors"
                      onClick={() => handleSelectValue(value.id)}
                    >
                      {value.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

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
              {selectValuesMutation.isPending ? "جاري الحفظ..." : `المتابعة (${selectedValueIds.length} قيمة)`}
            </Button>
          </div>

          {/* Info Messages */}
          {selectedValueIds.length >= 5 && selectedValueIds.length <= 50 && (
            <div className="text-center text-sm text-green-600 bg-green-50 p-4 rounded-lg border border-green-200">
              <p>✓ رائع! لديك {selectedValueIds.length} قيمة. يمكنك المتابعة الآن أو إضافة المزيد.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

