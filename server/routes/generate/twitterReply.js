import path from "path";
import { startSpinner, logInfo, logOk, logErr, logWarn, COLORS } from "../../lib/logger.js";
import { sanitizeText, removeContractions } from "../../lib/helpers.js";
import { DATA_DIR, saveEntryToJSON, loadJSON } from "../../lib/storage.js";
import { generateReplyFromGrok } from "../../services/aiService.js";

function registerTwitterReplyRoute(app) {
  app.post("/generate", async (req, res) => {
    const { caption, roomId, komentar = [] } = req.body;

    if (!caption || !roomId) {
      logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} Missing caption/roomId on /generate`);
      return res.status(400).json({ error: "caption and roomId are required" });
    }

    const jsonPath = path.join(DATA_DIR, `${roomId}.json`);
    logInfo(`${COLORS.cyan}${req._id}${COLORS.reset} 💬 Komentar (Twitter): ${COLORS.gray}${komentar.length} items${COLORS.reset}`);

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
You are a friendly, real Twitter user in the "${roomId}" community.
Always respond naturally, casually, and conversationally, never robotic or template-like.

Language Behavior:

Automatically detect the language of the tweet.

ALWAYS reply in the same language as the tweet.

Do not switch languages unless explicitly asked to translate.

If the tweet is in Indonesian, use casual daily chat style, not formal or textbook.

In any language, keep the tone informal, relaxed, and human.

Task:
Write ONE authentic reply to the tweet below.

One complete sentence only

8–15 words

Do NOT copy the tweet or reply history

Do NOT ask questions

Do NOT use symbols — or -

Write a reaction or statement with some substance, context, or personal touch

Keep it like a normal person chatting on Twitter

Emojis allowed only if they feel natural, avoid generic ones

English Style Rules (if replying in English):

Use casual learner-style English with slight imperfections

You may use u, ur, cuz, tho, rly naturally

NEVER use contractions with apostrophe s

Always use full forms like it is, that is, I am, we are

Avoid perfect grammar, keep it friendly and genuine

Context:

Recent replies: ${historyText || "(no history yet)"}

New tweet: "${caption}"

Output:
One sentence reply only, 8–15 words.

`;

    const spinner = startSpinner(`${req._id} /generate`, "AI thinking");
    try {
      const rawReply = await generateReplyFromGrok(prompt);
      const reply = removeContractions(rawReply);
      const elapsed = Date.now() - req._t0;

      const trimmed = reply?.trim() || "";
      const hasQuestion = /[?？]/.test(trimmed);

      if (
        !trimmed ||
        trimmed.length < 5 ||
        trimmed.includes(caption.trim()) ||
        hasQuestion
      ) {
        spinner.stop(false, `${COLORS.red}invalid reply${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
        return res.status(500).json({ error: "Reply not valid" });
      }

      spinner.stop(true, `${COLORS.green}ok${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
      logOk(`${COLORS.cyan}${req._id}${COLORS.reset} X reply: ${COLORS.gray}"${reply.trim()}"${COLORS.reset}`);
      res.json({ reply });
    } catch (err) {
      const elapsed = Date.now() - req._t0;
      spinner.stop(false, `${COLORS.red}error${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
      logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (Twitter): ${err?.message || err}`);
      res.status(500).json({ error: "Gagal generate konten" });
    }
  });
}

export { registerTwitterReplyRoute };


