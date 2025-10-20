import { Request, Response } from "express";
import nodemailer from "nodemailer";

// SMTP Configuration - should be set via environment variables
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

export async function sendEmailReport(req: Request, res: Response) {
  try {
    const { email, sessionId, topValues, scenarios } = req.body;

    if (!email || !topValues || !scenarios) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!SMTP_USER || !SMTP_PASS) {
      console.error("SMTP credentials not configured");
      return res.status(500).json({ error: "Email service not configured" });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    // Generate email content
    const emailHtml = generateEmailHtml(topValues, scenarios);
    const emailText = generateEmailText(topValues, scenarios);

    // Send email
    const info = await transporter.sendMail({
      from: `"مصفوفة القيم" <${SMTP_FROM}>`,
      to: email,
      subject: "تقرير مصفوفة القيم - قيمك الحاكمة",
      text: emailText,
      html: emailHtml,
    });

    console.log("Email sent:", info.messageId);

    return res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("Error sending email:", error);
    return res.status(500).json({ error: "Failed to send email" });
  }
}

function generateEmailHtml(topValues: any[], scenarios: any[]): string {
  const top3 = topValues.slice(0, 3);
  
  let html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تقرير مصفوفة القيم</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2563eb;
      text-align: center;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
    }
    h2 {
      color: #1e40af;
      margin-top: 30px;
    }
    .value-card {
      background-color: #f8fafc;
      border-right: 4px solid #3b82f6;
      padding: 15px;
      margin: 15px 0;
      border-radius: 5px;
    }
    .value-title {
      font-size: 1.3em;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 5px;
    }
    .value-definition {
      font-style: italic;
      color: #475569;
      margin: 10px 0;
    }
    .scenario {
      background-color: #fef3c7;
      border-right: 4px solid #f59e0b;
      padding: 15px;
      margin: 15px 0;
      border-radius: 5px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      color: #6b7280;
    }
    .badge {
      display: inline-block;
      background-color: #3b82f6;
      color: white;
      padding: 5px 10px;
      border-radius: 5px;
      font-size: 0.9em;
      margin-left: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏆 تقرير مصفوفة القيم</h1>
    
    <h2>قيمك الحاكمة الثلاثة</h2>
    <p>هذه هي القيم الأكثر تأثيراً في حياتك بناءً على اختياراتك:</p>
    
    ${top3.map((value: any, index: number) => `
      <div class="value-card">
        <div class="value-title">
          <span class="badge">#${index + 1}</span>
          ${value.valueName}
          <span style="color: #6b7280; font-size: 0.9em;">(${value.finalScore} نقطة)</span>
        </div>
        <div class="value-definition">"${value.definition}"</div>
      </div>
    `).join('')}
    
    <h2>القيم العشرة الأوائل</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">الترتيب</th>
          <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">القيمة</th>
          <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">النقاط</th>
        </tr>
      </thead>
      <tbody>
        ${topValues.map((value: any, index: number) => `
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">#${index + 1}</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${value.valueName}</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${value.finalScore}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <h2>ملخص السيناريوهات (${scenarios.length} سيناريو)</h2>
    <p>فيما يلي عينة من السيناريوهات التي فاضلت فيها بين قيمك:</p>
    
    ${scenarios.slice(0, 5).map((scenario: any, index: number) => `
      <div class="scenario">
        <strong>السيناريو ${index + 1}:</strong>
        <p style="margin: 10px 0; white-space: pre-wrap;">${scenario.scenarioText.substring(0, 300)}...</p>
        <p style="color: #059669; font-weight: bold;">
          اخترت: ${scenario.selectedValueId ? 'قيمة محددة' : 'لم يتم الاختيار'}
        </p>
      </div>
    `).join('')}
    
    <div class="footer">
      <p><strong>البساطة منتهى التطور</strong></p>
      <p>@SamahBalkhair2025</p>
      <p style="margin-top: 20px; font-size: 0.9em;">
        💡 تذكر: القيم ليست ثابتة، يُنصح بإعادة هذا التمرين بشكل دوري لمواكبة تطورك الشخصي
      </p>
    </div>
  </div>
</body>
</html>
  `;
  
  return html;
}

function generateEmailText(topValues: any[], scenarios: any[]): string {
  const top3 = topValues.slice(0, 3);
  
  let text = `تقرير مصفوفة القيم\n\n`;
  text += `قيمك الحاكمة الثلاثة:\n\n`;
  
  top3.forEach((value: any, index: number) => {
    text += `#${index + 1} - ${value.valueName} (${value.finalScore} نقطة)\n`;
    text += `التعريف: "${value.definition}"\n\n`;
  });
  
  text += `\nالقيم العشرة الأوائل:\n\n`;
  topValues.forEach((value: any, index: number) => {
    text += `#${index + 1} - ${value.valueName}: ${value.finalScore} نقطة\n`;
  });
  
  text += `\n\nتم إنشاء ${scenarios.length} سيناريو للمفاضلة بين قيمك.\n\n`;
  text += `البساطة منتهى التطور\n`;
  text += `@SamahBalkhair2025\n`;
  
  return text;
}

