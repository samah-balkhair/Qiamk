import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Footer from "@/components/Footer";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
// Authentication removed for public access
import { toast } from "sonner";
import { Trophy, Mail, CheckCircle2, Share2 } from "lucide-react";

export default function Results() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get("session");
  const [email, setEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);

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

  // Calculate top 3 values based on final scores (or all available if less than 3)
  const top3Values = topValues
    ?.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0))
    .slice(0, Math.min(3, topValues.length));

  // Save results when component mounts
  useEffect(() => {
    if (top3Values && top3Values.length > 0 && sessionId) {
      saveResults();
      generateShareImage();
    }
  }, [top3Values, sessionId]);

  const saveResults = async () => {
    if (!top3Values || top3Values.length === 0 || !sessionId) return;

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

      // Send to GoHighLevel (disabled temporarily)
      // await sendToGoHighLevel();
    } catch (error) {
      console.error("Failed to save results:", error);
    }
  };

  const sendToGoHighLevel = async () => {
    // Temporarily disabled - GoHighLevel integration
    console.log("GoHighLevel integration disabled");
    return;
  };

  const generateShareImage = async () => {
    if (!top3Values || top3Values.length < 3) return;

    try {
      const response = await fetch("/api/generate-share-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value1: top3Values[0].valueName,
          value2: top3Values[1].valueName,
          value3: top3Values[2].valueName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShareImageUrl(data.imageUrl);
      }
    } catch (error) {
      console.error("Failed to generate share image:", error);
    }
  };

  const handleShare = (platform: string) => {
    if (!top3Values || top3Values.length < 3) return;

    const text = `💎 منصة قيمك — الأداة العملية لاكتشاف القيم الحاكمة في حياتك

✨ اكتشفت قيمي الحاكمة 🎯
1️⃣ ${top3Values[0].valueName}
2️⃣ ${top3Values[1].valueName}
3️⃣ ${top3Values[2].valueName} 😍

تجربة ساعدتني أفهم أكثر ليش أتخذ قراراتي بهذه الطريقة
وإيش فعلاً القيم اللي تمثلني وتوجّهني 🧭

جرّبها أنت كمان واكتشف قيمك الحاكمة 👇`;
    const url = "https://qiamk.com";

    let shareUrl = "";

    switch (platform) {
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
        break;
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
    }
  };

  const handleSendEmail = async () => {
    if (!email || !sessionId || !topValues || !allScenarios) {
      toast.error("البيانات غير مكتملة");
      return;
    }

    if (!top3Values || top3Values.length < 3) {
      toast.error("يجب أن يكون لديك 3 قيم على الأقل");
      return;
    }

    setIsSendingEmail(true);

    try {
      // 1. Send email report
      const emailResponse = await fetch("/api/send-email-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          sessionId,
          topValues: topValues.slice(0, 10),
          scenarios: allScenarios,
        }),
      });

      const emailData = await emailResponse.json();

      if (!emailResponse.ok) {
        console.error("Email API error:", emailData);
        throw new Error(emailData.error || "Failed to send email");
      }

      console.log("Email sent successfully:", emailData);

      // 2. Send to GoHighLevel
      try {
        const ghlResponse = await fetch("/api/send-to-ghl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            value1: `${top3Values[0].valueName}: ${top3Values[0].definition}`,
            value2: `${top3Values[1].valueName}: ${top3Values[1].definition}`,
            value3: `${top3Values[2].valueName}: ${top3Values[2].definition}`,
          }),
        });

        if (ghlResponse.ok) {
          console.log("Successfully sent to GoHighLevel");
        } else {
          console.error("Failed to send to GoHighLevel");
        }
      } catch (ghlError) {
        console.error("GoHighLevel error:", ghlError);
        // Don't fail the whole process if GHL fails
      }

      // 3. Clean up session data (keep final results)
      try {
        const cleanupResponse = await fetch("/api/cleanup-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        
        if (cleanupResponse.ok) {
          console.log("Session data cleaned up");
        }
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError);
        // Don't fail if cleanup fails
      }

      setEmailSent(true);
      toast.success("تم إرسال التقرير بنجاح!");
    } catch (error: any) {
      console.error("Failed to send email:", error);
      const errorMessage = error.message || "حدث خطأ أثناء إرسال البريد الإلكتروني";
      toast.error(errorMessage);
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

          {/* Share Section */}
          <Card className="border-2 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 ml-2" />
                شارك قيمك الحاكمة
              </CardTitle>
              <CardDescription>
                شارك اكتشافك مع الآخرين على منصات التواصل الاجتماعي
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  className="bg-blue-50 hover:bg-blue-100 border-blue-300"
                  onClick={() => handleShare("twitter")}
                >
                  <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Twitter/X
                </Button>
                <Button
                  variant="outline"
                  className="bg-blue-50 hover:bg-blue-100 border-blue-300"
                  onClick={() => handleShare("linkedin")}
                >
                  <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </Button>
                <Button
                  variant="outline"
                  className="bg-blue-50 hover:bg-blue-100 border-blue-300"
                  onClick={() => handleShare("facebook")}
                >
                  <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </Button>
                <Button
                  variant="outline"
                  className="bg-green-50 hover:bg-green-100 border-green-300"
                  onClick={() => handleShare("whatsapp")}
                >
                  <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  WhatsApp
                </Button>
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
              العودة للصفحة الرئيسية
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

