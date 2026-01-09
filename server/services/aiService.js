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
      model: "grok-4-1-fast-non-reasoning",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });
    console.log("[Grok] Success!");

    if (!completion || !completion.choices || !completion.choices[0]) {
      console.error("[Grok] Unexpected response structure:", JSON.stringify(completion, null, 2));
      throw new Error("Invalid response from AI provider: No choices returned.");
    }

    // Log token usage and cost estimation
    const usage = completion.usage;
    if (usage) {
      // xAI grok-3-fast pricing: $0.2/1M input, $0.5/1M output
      const INPUT_COST_PER_TOKEN = 0.2 / 1_000_000;  // $0.0000002
      const OUTPUT_COST_PER_TOKEN = 0.5 / 1_000_000; // $0.0000005

      const inputCost = usage.prompt_tokens * INPUT_COST_PER_TOKEN;
      const outputCost = usage.completion_tokens * OUTPUT_COST_PER_TOKEN;
      const totalCost = inputCost + outputCost;

      // Format cost to show in micro-dollars for readability
      const formatCost = (cost) => {
        if (cost < 0.0001) return `$${(cost * 1000000).toFixed(2)}µ`; // micro-dollars
        if (cost < 0.01) return `$${(cost * 1000).toFixed(3)}m`; // milli-dollars
        return `$${cost.toFixed(6)}`;
      };

      console.log(`[Grok] 📊 Tokens: \x1b[36min:${usage.prompt_tokens}\x1b[0m | \x1b[32mout:${usage.completion_tokens}\x1b[0m | \x1b[33mtotal:${usage.total_tokens}\x1b[0m`);
      console.log(`[Grok] 💰 Cost: \x1b[36min:${formatCost(inputCost)}\x1b[0m | \x1b[32mout:${formatCost(outputCost)}\x1b[0m | \x1b[33mtotal:${formatCost(totalCost)}\x1b[0m`);
    }

    return {
      content: completion.choices[0].message.content,
      usage: usage || null
    };
  } catch (error) {
    console.error("[Grok] Request failed:", error);
    throw error;
  }
}

export { openai, generateReplyFromGrok };
