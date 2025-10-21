import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, BookOpen } from "lucide-react";

export default function Welcome() {
  const [, setLocation] = useLocation();
  const [animatedCount, setAnimatedCount] = useState(0);

  // Get completed sessions count
  const { data: completedCount, isLoading: isCountLoading } = trpc.sessions.getCompletedCount.useQuery();

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

  const handleGoToInstructions = () => {
    window.scrollTo(0, 0);
    setLocation("/instructions");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-3xl w-full text-center space-y-10">
          {/* العنوان */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
              مصفوفة القيم
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 font-medium">
              اكتشف قيمك الحاكمة بطريقة ممنهجة
            </p>
          </div>

          {/* البطاقة الرئيسية */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 space-y-8">
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
              أداة علمية لاكتشاف القيم الحاكمة التي توجه قراراتك وتعمل كبوصلة داخلية في حياتك.
            </p>

            {/* زر التعليمات */}
            <div className="pt-2">
              <Button
                onClick={handleGoToInstructions}
                size="lg"
                className="text-xl px-12 py-7 h-auto rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 flex items-center gap-3"
              >
                <BookOpen className="h-6 w-6" />
                اقرأ التعليمات
              </Button>
            </div>

            {/* عداد المستخدمين */}
            <div className="pt-4 border-t border-gray-200">
              {isCountLoading ? (
                <div className="flex items-center justify-center gap-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">جاري التحميل...</span>
                </div>
              ) : completedCount && completedCount > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-3">
                    <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {animatedCount.toLocaleString("ar-SA")}
                    </div>
                  </div>
                  <p className="text-base text-gray-600">
                    شخص اكتشفوا قيمهم الحاكمة من خلال مصفوفة القيم
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  كن أول من يكتشف قيمه الحاكمة!
                </p>
              )}
            </div>
          </div>

          {/* ملاحظة تحفيزية */}
          <div className="text-center">
            <p className="text-base text-gray-500">
              💡 تذكر: القيم ليست ثابتة، يُنصح بإعادة هذا التمرين بشكل دوري لمواكبة تطورك الشخصي.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

