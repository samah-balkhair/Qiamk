import { Request, Response } from "express";
import { generateWithGemini } from "../_core/gemini";

export async function generateScenario(req: Request, res: Response) {
  try {
    const { value1Name, value1Definition, value2Name, value2Definition } = req.body;

    if (!value1Name || !value1Definition || !value2Name || !value2Definition) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const prompt = `اريد أن اختبر نفسي في المفاضلة بين قيمتي "${value1Name}" و "${value2Name}". بالنسبة لي، تعريف "${value1Name}" هو: "${value1Definition}" وتعريف "${value2Name}" هو: "${value2Definition}". 

انشئ لي سيناريو متطرف يجبرني على الاختيار ما بين هاتين القيمتين بحيث أن اختيار أحدهما يعني التخلي عن القيمة الأخرى. السيناريو يجب ان يكون في الحياة الواقعية. 

اكتب لي في البداية عنوان المفاضلة ما بين القيمتين وتعريفهما ثم اسرد السيناريو بعدها.`;

    const systemInstruction = "أنت خبير في إنشاء سيناريوهات متطرفة تساعد الأشخاص على اكتشاف قيمهم الحقيقية. السيناريوهات يجب أن تكون واقعية، مؤثرة، وتجبر الشخص على اختيار قيمة واحدة فقط.";
    
    const scenario = await generateWithGemini(prompt, systemInstruction);

    return res.json({ scenario });
  } catch (error) {
    console.error("Error generating scenario:", error);
    return res.status(500).json({ error: "Failed to generate scenario" });
  }
}

