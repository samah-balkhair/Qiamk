import { ENV } from "./env";

export async function generateWithGemini(prompt: string, systemInstruction?: string): Promise<string> {
  if (!ENV.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  // Use REST API directly with v1 (stable) instead of v1beta
  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${ENV.geminiApiKey}`;
  
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.9,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    }
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData);
      throw new Error(`Gemini API returned ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const text = data.candidates[0].content.parts[0].text;
    return text;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

