import dotenv from "dotenv";
import OpenAI from "openai";

// SSL bypass (just in case)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

// Check AI connection on startup
async function checkAIConnection() {
  console.log("\x1b[36m[AI Check]\x1b[0m Checking xAI API connection...");

  if (!process.env.XAI_API_KEY) {
    console.log("\x1b[31m[AI Check] ❌ XAI_API_KEY not found in .env file!\x1b[0m");
    console.log("\x1b[33m[AI Check] Please add XAI_API_KEY=your_key_here to .env\x1b[0m");
    return false;
  }

  try {
    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: "grok-3-fast",
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 5,
    });
    const elapsed = Date.now() - startTime;

    if (completion && completion.choices && completion.choices[0]) {
      console.log(`\x1b[32m[AI Check] ✅ xAI API connected successfully! (${elapsed}ms)\x1b[0m`);
      console.log(`\x1b[90m[AI Check] Model: grok-3-fast | Response: "${completion.choices[0].message.content}"\x1b[0m`);
      return true;
    } else {
      console.log("\x1b[31m[AI Check] ❌ Unexpected response from xAI\x1b[0m");
      return false;
    }
  } catch (error) {
    console.log(`\x1b[31m[AI Check] ❌ Failed to connect to xAI: ${error.message}\x1b[0m`);
    if (error.message.includes("401") || error.message.includes("Unauthorized")) {
      console.log("\x1b[33m[AI Check] ⚠️ Invalid API key. Please check your XAI_API_KEY\x1b[0m");
    } else if (error.message.includes("ENOTFOUND") || error.message.includes("network")) {
      console.log("\x1b[33m[AI Check] ⚠️ Network error. Check your internet connection\x1b[0m");
    }
    return false;
  }
}

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

export { openai, generateReplyFromGrok, checkAIConnection };

