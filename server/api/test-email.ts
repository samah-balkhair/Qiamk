import { Request, Response } from "express";
import nodemailer from "nodemailer";

export async function testEmail(req: Request, res: Response) {
  try {
    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;
    const SMTP_FROM = process.env.SMTP_FROM;

    console.log("SMTP Configuration:", {
      host: SMTP_HOST,
      port: SMTP_PORT,
      user: SMTP_USER,
      from: SMTP_FROM,
      hasPassword: !!SMTP_PASS,
    });

    if (!SMTP_USER || !SMTP_PASS) {
      return res.status(500).json({ 
        error: "SMTP credentials not configured",
        config: {
          host: SMTP_HOST,
          port: SMTP_PORT,
          user: SMTP_USER,
          hasPassword: !!SMTP_PASS,
        }
      });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    // Verify connection
    await transporter.verify();
    console.log("SMTP connection verified successfully");

    // Send test email
    const info = await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: SMTP_USER, // Send to self for testing
      subject: "اختبار SMTP - مصفوفة القيم",
      text: "هذا بريد اختباري من منصة مصفوفة القيم",
      html: "<h1>اختبار SMTP</h1><p>إذا وصلك هذا البريد، فإن إعدادات SMTP تعمل بشكل صحيح!</p>",
    });

    console.log("Test email sent:", info.messageId);

    return res.json({ 
      success: true, 
      messageId: info.messageId,
      message: "Test email sent successfully"
    });
  } catch (error: any) {
    console.error("SMTP Test Error:", error);
    return res.status(500).json({ 
      error: "SMTP test failed",
      details: error.message,
      code: error.code,
      command: error.command,
    });
  }
}

