import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Footer from "@/components/Footer";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Trophy, Mail, CheckCircle2 } from "lucide-react";

export default function Results() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get("session");
  const { user } = useAuth();

  const [email, setEmail] = useState(user?.email || "");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const { data: topValues } = trpc.values.getTopValues.useQuery(
    { sessionId: sessionId!, limit: 10 },
    { enabled: !!sessionId }
  );

  const { data: allScenarios } = trpc.scenarios.getAll.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );

  const saveResultMutation = trpc.results.save.useMutation();
  const markEmailSentMutation = trpc.results.markEmailSent.useMutation();

  // Calculate top 3 values based on final scores
  const top3Values = topValues
    ?.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0))
    .slice(0, 3);

  // Save results when component mounts
  useEffect(() => {
    if (top3Values && top3Values.length === 3 && sessionId) {
      saveResults();
    }
  }, [top3Values, sessionId]);

  const saveResults = async () => {
    if (!top3Values || top3Values.length < 3 || !sessionId) return;

    try {
      await saveResultMutation.mutateAsync({
        sessionId,
        topValue1Id: top3Values[0].id,
        topValue1Definition: top3Values[0].definition || "",
        topValue2Id: top3Values[1].id,
        topValue2Definition: top3Values[1].definition || "",
        topValue3Id: top3Values[2].id,
        topValue3Definition: top3Values[2].definition || "",
      });

      // Send to GoHighLevel
      await sendToGoHighLevel();
    } catch (error) {
      console.error("Failed to save results:", error);
    }
  };

  const sendToGoHighLevel = async () => {
    if (!user || !top3Values) return;

    try {
      const response = await fetch("/api/send-to-ghl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          phone: "", // Add phone if available
          topValue1: top3Values[0].valueName,
          topValue2: top3Values[1].valueName,
          topValue3: top3Values[2].valueName,
        }),
      });

      if (response.ok) {
        console.log("Successfully sent to GoHighLevel");
      }
    } catch (error) {
      console.error("Failed to send to GoHighLevel:", error);
    }
  };

  const handleSendEmail = async () => {
    if (!email || !sessionId || !topValues || !allScenarios) {
      toast.error("البيانات غير مكتملة");
      return;
    }

    setIsSendingEmail(true);

    try {
      const response = await fetch("/api/send-email-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          sessionId,
          topValues: topValues.slice(0, 10),
          scenarios: allScenarios,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send email");
      }

      // Mark email as sent (will be done in the backend)
      // The backend should handle marking email as sent

      setEmailSent(true);
      toast.success("تم إرسال التقرير إلى بريدك الإلكتروني!");
    } catch (error) {
      console.error("Failed to send email:", error);
      toast.error("حدث خطأ أثناء إرسال البريد الإلكتروني");
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-red-600">معرف الجلسة غير موجود</p>
      </div>
    );
  }

  if (!top3Values || top3Values.length < 3) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <main className="flex-1 container py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Trophy className="h-20 w-20 text-yellow-500" />
            </div>
            <h1 className="text-5xl font-bold text-slate-900">قيمك الحاكمة</h1>
            <p className="text-xl text-slate-600">
              هذه هي القيم الثلاثة الأكثر تأثيراً في حياتك
            </p>
          </div>

          {/* Top 3 Values */}
          <div className="space-y-6">
            {top3Values.map((value, index) => (
              <Card 
                key={value.id} 
                className={`border-2 ${
                  index === 0 
                    ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50" 
                    : index === 1 
                    ? "border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100"
                    : "border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50"
                }`}
              >
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Badge 
                      className={`text-2xl px-4 py-2 ${
                        index === 0 
                          ? "bg-yellow-500" 
                          : index === 1 
                          ? "bg-slate-400"
                          : "bg-orange-400"
                      }`}
                    >
                      #{index + 1}
                    </Badge>
                    <CardTitle className="text-3xl">{value.valueName}</CardTitle>
                    <Badge variant="outline" className="mr-auto text-base">
                      {value.finalScore} نقطة
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-700">تعريفك:</p>
                    <p className="text-lg text-slate-800 italic leading-relaxed">
                      "{value.definition}"
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Email Report Section */}
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 ml-2" />
                احصل على التقرير التفصيلي
              </CardTitle>
              <CardDescription>
                سنرسل لك تقريراً شاملاً يحتوي على قيمك العشرة الأوائل، جميع السيناريوهات، واختياراتك في كل جولة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={emailSent}
                />
              </div>
              
              {emailSent ? (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-lg border border-green-200">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>تم إرسال التقرير بنجاح!</span>
                </div>
              ) : (
                <Button
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || !email}
                  className="w-full"
                  size="lg"
                >
                  {isSendingEmail ? "جاري الإرسال..." : "إرسال التقرير"}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Insights */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
            <CardHeader>
              <CardTitle>💡 ماذا بعد؟</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-slate-700">
              <p>
                • <strong>استخدم قيمك كبوصلة</strong> في اتخاذ القرارات المهمة في حياتك
              </p>
              <p>
                • <strong>راجع قيمك دورياً</strong> - القيم تتطور مع الوقت والخبرات
              </p>
              <p>
                • <strong>شارك قيمك</strong> مع الأشخاص المقربين لتعزيز التفاهم المتبادل
              </p>
              <p>
                • <strong>اتخذ قرارات واعية</strong> متوافقة مع قيمك الحاكمة
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setLocation("/")}
            >
              العودة للصفحة الرئيسية
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

