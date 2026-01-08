import dotenv from "dotenv";
import OpenAI from "openai";

// SSL bypass (just in case)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

async function generateReplyFromGrok(prompt) {
  try {
    console.log("[Grok] Sending request to xAI...");
    const completion = await openai.chat.completions.create({
      model: "grok-3-fast",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });
    console.log("[Grok] Success!");

    if (!completion || !completion.choices || !completion.choices[0]) {
      console.error("[Grok] Unexpected response structure:", JSON.stringify(completion, null, 2));
      throw new Error("Invalid response from AI provider: No choices returned.");
    }
    return completion.choices[0].message.content;
  } catch (error) {
    console.error("[Grok] Request failed:", error);
    throw error;
  }
}

export { openai, generateReplyFromGrok };
