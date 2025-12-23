import { startSpinner, logErr, COLORS } from "../../lib/logger.js";
import { sanitizeText, removeContractions } from "../../lib/helpers.js";
import { generateReplyFromGrok } from "../../services/aiService.js";

function registerParaphraseRoute(app) {
  app.post("/generate-parafrase", async (req, res) => {
    const spinner = startSpinner(`${req._id} /generate-parafrase`, "AI thinking");
    try {
      const { text } = req.body || {};
      if (!text || !text.trim()) {
        spinner.stop(false, `${COLORS.red}bad request${COLORS.reset}`);
        return res.status(400).json({ error: "text is required" });
      }

      const prompt = `
You are an expert editor for Discord chat conversations.
Rewrite the user message in natural, concise, friendly English that feels human and conversational.

Guidelines:

Preserve the original meaning, intent, and tone

Improve grammar, word choice, and flow

Keep it short, ideally one sentence

Do NOT add emojis unless they already exist in the original

Do NOT add explanations, notes, or extra text

Input:
Original: "${sanitizeText(text)}"

Output:
The rewritten sentence only.
`.trim();

      const rawImproved = await generateReplyFromGrok(prompt);
      const improved = removeContractions(rawImproved);
      spinner.stop(true, `${COLORS.green}ok${COLORS.reset}`);
      return res.json({ text: improved?.trim() || "" });
    } catch (err) {
      spinner.stop(false, `${COLORS.red}error${COLORS.reset}`);
      logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (/generate-parafrase): ${err?.message || err}`);
      return res.status(500).json({ error: "Failed to paraphrase" });
    }
  });
}

export { registerParaphraseRoute };











