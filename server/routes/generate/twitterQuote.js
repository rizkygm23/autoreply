import path from "path";
import { startSpinner, logInfo, logOk, logErr, logWarn, COLORS } from "../../lib/logger.js";
import { sanitizeText, removeContractions } from "../../lib/helpers.js";
import { DATA_DIR, saveEntryToJSON, loadJSON } from "../../lib/storage.js";
import { generateReplyFromGrok } from "../../services/aiService.js";

function registerTwitterQuoteRoute(app) {
  app.post("/generate-quote", async (req, res) => {
    const { caption, roomId, komentar = [] } = req.body;

    if (!caption || !roomId) {
      logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} Missing caption/roomId on /generate-quote`);
      return res.status(400).json({ error: "caption and roomId are required" });
    }

    const jsonPath = path.join(DATA_DIR, `${roomId}.json`);
    logInfo(`${COLORS.cyan}${req._id}${COLORS.reset} 💬 Quote Retweet (Twitter): ${COLORS.gray}${komentar.length} items${COLORS.reset}`);

    const newEntry = { caption, komentar };
    saveEntryToJSON(jsonPath, newEntry);

    const history = loadJSON(jsonPath);
    const historyText = history
      .slice(-20)
      .map((entry, idx) => {
        const cleanedCaption = sanitizeText(entry.caption);
        const kom =
          entry.komentar?.map((k, i) => `${i + 1}. @${k.username}: ${sanitizeText(k.reply)}`).join("\n") || "";
        return `## Example ${idx + 1}\nCaption: "${cleanedCaption}"\nReplies:\n${kom}`;
      })
      .join("\n\n");

    const prompt = `
You are a friendly user in the "${roomId}" community, replying like a real person on Twitter.
Always natural, casual, and conversational, never robotic or template-like.

Task:
Write ONE short quote retweet comment that appears above the quoted tweet.

Maximum 1 sentence

No paragraphs or lists

Do NOT copy the tweet or reply history

Do NOT use symbols — or -

Keep it simple, human, and natural, like a normal reaction or thought

It may express a reaction, opinion, or a light thought-provoking question

Emojis are allowed only if they feel natural, avoid generic ones

Language Rules:

NEVER use contractions ending with apostrophe s

ALWAYS use full forms like it is, that is, what is

Avoid apostrophes in contractions entirely

Use clear, conversational English

Keep the tone friendly and genuine

Context:

Recent replies: ${historyText || "(no history yet)"}

Tweet to quote: "${caption}"

Output:
One sentence quote retweet comment only.
`;

    const spinner = startSpinner(`${req._id} /generate-quote`, "AI thinking");
    try {
      const rawReply = await generateReplyFromGrok(prompt);
      const reply = removeContractions(rawReply);
      const elapsed = Date.now() - req._t0;

      if (!reply || reply.trim().length < 5 || reply.includes(caption.trim())) {
        spinner.stop(false, `${COLORS.red}invalid reply${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
        return res.status(500).json({ error: "Reply not valid" });
      }

      spinner.stop(true, `${COLORS.green}ok${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
      logOk(`${COLORS.cyan}${req._id}${COLORS.reset} Quote retweet: ${COLORS.gray}"${reply.trim()}"${COLORS.reset}`);
      res.json({ reply });
    } catch (err) {
      const elapsed = Date.now() - req._t0;
      spinner.stop(false, `${COLORS.red}error${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
      logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (Quote): ${err?.message || err}`);
      res.status(500).json({ error: "Gagal generate quote retweet" });
    }
  });
}

export { registerTwitterQuoteRoute };










