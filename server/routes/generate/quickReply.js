import { startSpinner, logOk, logErr, logWarn, COLORS } from "../../lib/logger.js";
import { sanitizeText, removeContractions } from "../../lib/helpers.js";
import { generateReplyFromGrok } from "../../services/aiService.js";

function registerQuickReplyRoute(app) {
  app.post("/generate-quick", async (req, res) => {
    const { caption, roomId } = req.body;

    if (!caption || !roomId) {
      logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} Missing caption/roomId on /generate-quick`);
      return res.status(400).json({ error: "caption and roomId are required" });
    }

    const spinner = startSpinner(`${req._id} /generate-quick`, "AI thinking");
    try {
      const prompt = `
You are a friendly user in the "${roomId}" community.

Language behaviour:
- First, detect the language of the tweet.
- ALWAYS reply in the **same language** as the tweet (if it is Chinese, reply in Chinese, if it is Indonesian, reply in Indonesian, etc).
- Do NOT switch language unless the user explicitly asks for a translation.
- If the tweet is in Indonesian, use **casual daily chat style** (ngobrol santai), avoid very formal / textbook wording.
- In any language, keep the tone informal and relaxed, not stiff or overly polite.

Requirements:
- ONE short sentence only
- Natural and conversational tone
- For English replies: Use casual, informal spelling like someone learning English:
  * "because" → "cuz" or "cause"
  * "you" → "u" (sometimes)
  * "your/you're" → "ur" (sometimes)
  * "though" → "tho"
  * "really" → "rly" or "real" (sometimes)
- Grammar should be slightly imperfect, like a learner - minor mistakes are okay
- NO contractions ending with 's (use "what is", "how is", "it is", etc.)
- But you CAN use: "u" for "you", "ur" for "your/you're", "cuz" for "because", "tho" for "though"
- Keep it simple and genuine with casual spelling

Tweet: "${sanitizeText(caption)}"

Your quick reply (1 sentence, natural, NO contractions with 's if you reply in English):
`.trim();

      const rawReply = await generateReplyFromGrok(prompt);
      const reply = removeContractions(rawReply);
      const elapsed = Date.now() - req._t0;

      if (!reply || reply.trim().length < 5) {
        spinner.stop(false, `${COLORS.red}invalid reply${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
        return res.status(500).json({ error: "Reply not valid" });
      }

      spinner.stop(true, `${COLORS.green}ok${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
      logOk(`${COLORS.cyan}${req._id}${COLORS.reset} Quick reply: ${COLORS.gray}"${reply.trim()}"${COLORS.reset}`);
      res.json({ reply });
    } catch (err) {
      const elapsed = Date.now() - req._t0;
      spinner.stop(false, `${COLORS.red}error${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
      logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (Quick): ${err?.message || err}`);
      res.status(500).json({ error: "Gagal generate quick reply" });
    }
  });
}

export { registerQuickReplyRoute };






