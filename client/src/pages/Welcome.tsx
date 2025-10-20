import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Footer from "@/components/Footer";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Users, Sparkles } from "lucide-react";

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const createSessionMutation = trpc.sessions.create.useMutation();
  const [animatedCount, setAnimatedCount] = useState(0);

  // Get completed sessions count
  const { data: completedCount } = trpc.sessions.getCompletedCount.useQuery();

  // Animate counter
  useEffect(() => {
    if (completedCount && completedCount > 0) {
      let current = 0;
      const increment = Math.ceil(completedCount / 50);
      const timer = setInterval(() => {
        current += increment;
        if (current >= completedCount) {
          setAnimatedCount(completedCount);
          clearInterval(timer);
        } else {
          setAnimatedCount(current);
        }
      }, 30);
      return () => clearInterval(timer);
    }
  }, [completedCount]);

  const handleStart = async () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    try {
      const session = await createSessionMutation.mutateAsync();
      setLocation(`/select-values?session=${session.id}`);
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <main className="flex-1 container py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold text-slate-900">مصفوفة القيم</h1>
            <p className="text-xl text-slate-600">اكتشف قيمك الحاكمة بطريقة ممنهجة</p>
            
            {/* Visitor Counter */}
            {completedCount !== undefined && completedCount > 0 && (
              <div className="mt-6 inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-6 py-3 rounded-full">
                <Users className="w-5 h-5" />
                <span className="font-semibold text-lg">
                  {animatedCount.toLocaleString('ar-SA')}
                </span>
                <span>شخص اكتشفوا قيمهم الحاكمة</span>
                <Sparkles className="w-5 h-5 text-yellow-500" />
              </div>
            )}
          </div>

          {/* Main Content Card */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl">ما هي مصفوفة القيم؟</CardTitle>
              <CardDescription className="text-base">
                أداة علمية لاكتشاف القيم الحاكمة التي توجه قراراتك وتعمل كبوصلة داخلية في حياتك
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="prose prose-slate max-w-none">
                <p className="text-lg leading-relaxed">
                  القرارات الخاطئة غالباً ما تنبع من عدم الوعي بقيمنا الشخصية. مصفوفة القيم تساعدك على 
                  اكتشاف قيمك الحقيقية من خلال منهجية علمية مدروسة تتكون من عدة مراحل متدرجة.
                </p>
              </div>

              {/* Steps */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-slate-50 p-4 rounded-lg border">
                  <h3 className="font-semibold text-lg mb-2 text-slate-900">١. صندوق القيم</h3>
                  <p className="text-slate-600">
                    اختر من 5 إلى 50 قيمة من قائمة شاملة تحتوي على أكثر من 170 قيمة، 
                    أو أضف قيمك الخاصة.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border">
                  <h3 className="font-semibold text-lg mb-2 text-slate-900">٢. المفاضلة الذكية</h3>
                  <p className="text-slate-600">
                    إذا اخترت أكثر من 10 قيم، سنستخدم خوارزمية ذكية للوصول إلى أهم 10 قيم لديك.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border">
                  <h3 className="font-semibold text-lg mb-2 text-slate-900">٣. تعريف القيم</h3>
                  <p className="text-slate-600">
                    عرّف كل قيمة من قيمك العشرة بأسلوبك الخاص لتعكس معناها الحقيقي بالنسبة لك.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border">
                  <h3 className="font-semibold text-lg mb-2 text-slate-900">٤. السيناريوهات المتطرفة</h3>
                  <p className="text-slate-600">
                    فاضل بين كل قيمتين من خلال 45 سيناريو متطرف يولده الذكاء الاصطناعي.
                  </p>
                </div>
              </div>

              {/* Result Preview */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-200">
                <h3 className="font-semibold text-xl mb-3 text-slate-900">النتيجة النهائية</h3>
                <p className="text-slate-700 leading-relaxed">
                  ستحصل على أعلى 3 قيم حاكمة لديك مع تعريفاتها، وتقرير تفصيلي يُرسل إلى بريدك 
                  الإلكتروني يحتوي على جميع السيناريوهات واختياراتك.
                </p>
              </div>

              {/* CTA */}
              <div className="flex justify-center pt-4">
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6"
                  onClick={handleStart}
                  disabled={createSessionMutation.isPending}
                >
                  {createSessionMutation.isPending ? "جاري التحضير..." : "ابدأ رحلة اكتشاف قيمك"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <div className="text-center text-slate-600">
            <p className="text-sm">
              💡 تذكر: القيم ليست ثابتة، يُنصح بإعادة هذا التمرين بشكل دوري لمواكبة تطورك الشخصي
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

