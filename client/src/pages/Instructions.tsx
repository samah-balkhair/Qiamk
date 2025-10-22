import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Footer from "@/components/Footer";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
// Authentication removed for public access
import { 
  CheckCircle2, 
  ListChecks, 
  FileText, 
  Layers, 
  Target,
  Clock,
  AlertCircle
} from "lucide-react";

export default function Instructions() {
  const [, setLocation] = useLocation();
  const createSessionMutation = trpc.sessions.create.useMutation();

  // Generate anonymous user ID for public access
  const generateAnonymousUserId = () => {
    return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleStart = async () => {
    try {
      // Create session with anonymous user ID
      const anonymousUserId = generateAnonymousUserId();
      const session = await createSessionMutation.mutateAsync({ userId: anonymousUserId });
      window.scrollTo(0, 0);
      setLocation(`/select-values?session=${session.id}`);
    } catch (error) {
      console.error("Failed to create session:", error);
      alert("حدث خطأ أثناء إنشاء الجلسة. يرجى المحاولة مرة أخرى.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <main className="flex-1 container py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
              تعليمات التمرين
            </h1>
            <p className="text-lg md:text-xl text-gray-600">
              دليلك الشامل لاكتشاف قيمك الحاكمة
            </p>
          </div>

          {/* Duration Warning */}
          <Card className="border-amber-300 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900">
                <Clock className="h-5 w-5" />
                ملاحظة مهمة عن مدة التمرين
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-amber-800">
                <strong>مدة التمرين مرتبطة بعدد القيم التي تختارها:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-amber-800 mr-4">
                <li>اختيار <strong>5-10 قيم</strong>: التمرين سيستغرق حوالي <strong>15-20 دقيقة</strong></li>
                <li>اختيار <strong>20-30 قيمة</strong>: التمرين سيستغرق حوالي <strong>30-45 دقيقة</strong></li>
                <li>اختيار <strong>40-50 قيمة</strong>: التمرين سيستغرق حوالي <strong>60-90 دقيقة</strong></li>
              </ul>
              <p className="text-amber-800 mt-3">
                💡 <strong>نوصي باختيار 10-15 قيمة</strong> للحصول على أفضل تجربة وأدق نتائج.
              </p>
            </CardContent>
          </Card>

          {/* Steps */}
          <div className="space-y-6">
            {/* Step 1 */}
            <Card className="border-blue-200">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Badge className="text-lg px-4 py-2 bg-blue-600">1</Badge>
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                      <ListChecks className="h-5 w-5" />
                      اختيار القيم
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 mr-16">
                <p className="text-gray-700">
                  في هذه المرحلة، ستختار القيم التي تعبر عنك من قائمة تحتوي على <strong>177 قيمة أساسية</strong>.
                </p>
                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                  <p className="font-medium text-blue-900">الضوابط:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 mr-4">
                    <li>الحد الأدنى: <strong>5 قيم</strong></li>
                    <li>الحد الأقصى: <strong>50 قيمة</strong></li>
                    <li>يمكنك البحث عن قيم محددة</li>
                    <li>يمكنك إضافة قيم مخصصة غير موجودة في القائمة</li>
                    <li>النظام يكتشف القيم المتشابهة تلقائياً لتجنب التكرار</li>
                  </ul>
                </div>
                <div className="flex items-start gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg">
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    <strong>تذكر:</strong> كلما زاد عدد القيم المختارة، زادت مدة التمرين في المراحل التالية.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card className="border-green-200">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Badge className="text-lg px-4 py-2 bg-green-600">2</Badge>
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-green-900">
                      <Layers className="h-5 w-5" />
                      المفاضلة المبدئية (إذا اخترت أكثر من 10 قيم)
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 mr-16">
                <p className="text-gray-700">
                  إذا اخترت <strong>أكثر من 10 قيم</strong>، ستمر بمرحلة مفاضلة مبدئية باستخدام خوارزمية ذكية (Merge Sort) لتحديد أهم 10 قيم لديك.
                </p>
                <div className="bg-green-50 rounded-lg p-4 space-y-2">
                  <p className="font-medium text-green-900">كيف تعمل:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 mr-4">
                    <li>ستظهر لك مقارنات ثنائية بين قيمتين</li>
                    <li>اختر القيمة الأهم بالنسبة لك في كل مقارنة</li>
                    <li>عدد المقارنات يعتمد على عدد القيم المختارة</li>
                    <li>شريط التقدم يوضح لك كم تبقى من مقارنات</li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">
                    💡 <strong>ملاحظة:</strong> إذا اخترت 10 قيم أو أقل، ستتخطى هذه المرحلة تلقائياً.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card className="border-purple-200">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Badge className="text-lg px-4 py-2 bg-purple-600">3</Badge>
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-purple-900">
                      <FileText className="h-5 w-5" />
                      تعريف القيم
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 mr-16">
                <p className="text-gray-700">
                  في هذه المرحلة، ستكتب تعريفاً شخصياً لكل قيمة من <strong>أعلى 10 قيم</strong> لديك.
                </p>
                <div className="bg-purple-50 rounded-lg p-4 space-y-2">
                  <p className="font-medium text-purple-900">الضوابط:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 mr-4">
                    <li>يجب تعريف <strong>جميع القيم العشرة</strong> قبل المتابعة</li>
                    <li>اكتب تعريفاً يعبر عن فهمك الشخصي للقيمة</li>
                    <li>لا يوجد حد أدنى أو أقصى لطول التعريف</li>
                    <li>يمكنك تعديل التعريفات في أي وقت قبل المتابعة</li>
                  </ul>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700">
                    📝 <strong>مثال:</strong> إذا كانت القيمة "الصدق"، يمكنك كتابة: "أن أكون صادقاً مع نفسي ومع الآخرين في جميع المواقف، حتى لو كان ذلك صعباً."
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Step 4 */}
            <Card className="border-orange-200">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Badge className="text-lg px-4 py-2 bg-orange-600">4</Badge>
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-orange-900">
                      <Target className="h-5 w-5" />
                      السيناريوهات المتطرفة
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 mr-16">
                <p className="text-gray-700">
                  المرحلة الأخيرة والأهم! ستواجه <strong>سيناريوهات متطرفة</strong> تضعك في مواقف صعبة تتطلب الاختيار بين قيمتين.
                </p>
                <div className="bg-orange-50 rounded-lg p-4 space-y-2">
                  <p className="font-medium text-orange-900">كيف تعمل:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 mr-4">
                    <li>يتم توليد السيناريوهات تلقائياً باستخدام الذكاء الاصطناعي</li>
                    <li>كل سيناريو يعرض موقفاً يتطلب الاختيار بين قيمتين من قيمك</li>
                    <li>عدد السيناريوهات يعتمد على عدد قيمك (45 سيناريو لـ 10 قيم)</li>
                    <li>يمكنك الرجوع للسيناريو السابق لتغيير إجابتك</li>
                    <li>يمكنك العودة لتعديل التعريفات (سيتم مسح السيناريوهات والبدء من جديد)</li>
                  </ul>
                </div>
                <div className="flex items-start gap-2 text-blue-700 bg-blue-50 p-3 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    <strong>نصيحة:</strong> خذ وقتك في قراءة كل سيناريو بعناية، واختر القيمة التي تشعر أنها أهم بالنسبة لك في ذلك الموقف.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Step 5 */}
            <Card className="border-indigo-200">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Badge className="text-lg px-4 py-2 bg-indigo-600">5</Badge>
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-indigo-900">
                      <CheckCircle2 className="h-5 w-5" />
                      النتائج والتقرير
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 mr-16">
                <p className="text-gray-700">
                  بعد إتمام جميع السيناريوهات، ستحصل على <strong>أعلى 3 قيم حاكمة</strong> لديك مع تعاريفها.
                </p>
                <div className="bg-indigo-50 rounded-lg p-4 space-y-2">
                  <p className="font-medium text-indigo-900">ما ستحصل عليه:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 mr-4">
                    <li>عرض تفاعلي لأعلى 3 قيم حاكمة</li>
                    <li>جدول بأعلى 10 قيم مع النقاط</li>
                    <li>ملخص السيناريوهات والاختيارات</li>
                    <li>تقرير تفصيلي يُرسل إلى بريدك الإلكتروني</li>
                    <li>إمكانية مشاركة النتائج على وسائل التواصل</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Final Note */}
          <Card className="border-gray-300 bg-gray-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-gray-600 flex-shrink-0 mt-1" />
                <div className="space-y-2">
                  <p className="font-medium text-gray-900">
                    💡 تذكر: القيم ليست ثابتة
                  </p>
                  <p className="text-gray-700">
                    يُنصح بإعادة هذا التمرين بشكل دوري (كل 6-12 شهر) لمواكبة تطورك الشخصي وتغير أولوياتك في الحياة.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Start Button */}
          <div className="text-center pt-6">
            <Button
              onClick={handleStart}
              disabled={createSessionMutation.isPending}
              size="lg"
              className="text-xl px-12 py-7 h-auto rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {createSessionMutation.isPending ? "جاري التحضير..." : "ابدأ رحلة اكتشاف قيمك"}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

