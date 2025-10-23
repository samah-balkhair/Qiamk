import { ENV } from "./env";

export async function generateWithGroq(prompt: string, systemInstruction?: string): Promise<string> {
  if (!ENV.groqApiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  
  const messages: Array<{ role: string; content: string }> = [];
  
  if (systemInstruction) {
    messages.push({
      role: 'system',
      content: systemInstruction
    });
  }
  
  messages.push({
    role: 'user',
    content: prompt
  });

  const requestBody = {
    model: 'llama-3.3-70b-versatile',
    messages: messages,
    temperature: 0.9,
    max_tokens: 2048,
    top_p: 1,
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ENV.groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Groq API Error:', errorData);
      throw new Error(`Groq API returned ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from Groq API');
    }

    const text = data.choices[0].message.content;
    return text;
  } catch (error) {
    console.error('Error calling Groq API:', error);
    throw error;
  }
}

