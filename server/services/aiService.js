import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

async function generateReplyFromGrok(prompt) {
  const completion = await openai.chat.completions.create({
    model: "grok-4-1-fast-non-reasoning",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });
  return completion.choices[0].message.content;
}

export { openai, generateReplyFromGrok };

