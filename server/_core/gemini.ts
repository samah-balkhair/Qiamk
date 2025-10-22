import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "./env";

export async function generateWithGemini(prompt: string, systemInstruction?: string): Promise<string> {
  if (!ENV.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(ENV.geminiApiKey);
  
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: systemInstruction || undefined,
  });

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  
  return text;
}

