import { startSpinner, logErr, COLORS } from "../../lib/logger.js";
import { sanitizeText, removeContractions } from "../../lib/helpers.js";
import { generateReplyFromGrok } from "../../services/aiService.js";

function registerTranslateRoute(app) {
  app.post("/generate-translate", async (req, res) => {
    const spinner = startSpinner(`${req._id} /generate-translate`, "AI thinking");
    try {
      const { text } = req.body || {};
      if (!text || !text.trim()) {
        spinner.stop(false, `${COLORS.red}bad request${COLORS.reset}`);
        return res.status(400).json({ error: "text is required" });
      }

      const prompt = `
Translate the following text from Bahasa Indonesia into natural, conversational English suitable for Discord chat.

Guidelines:

Keep it concise and natural

Preserve the original intent, tone, and nuance

Avoid formal or textbook phrasing

Do NOT add explanations, notes, or extra commentary

Input:
Indonesian: "${sanitizeText(text)}"

Output:
English translation only.
`.trim();

      const aiResponse = await generateReplyFromGrok(prompt);
      const translated = removeContractions(aiResponse.content);
      spinner.stop(true, `${COLORS.green}ok${COLORS.reset}`);
      return res.json({ text: translated?.trim() || "" });
    } catch (err) {
      spinner.stop(false, `${COLORS.red}error${COLORS.reset}`);
      logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (/generate-translate): ${err?.message || err}`);
      return res.status(500).json({ error: "Failed to translate" });
    }
  });
}

export { registerTranslateRoute };











