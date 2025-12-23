import path from "path";
import { startSpinner, logInfo, logOk, logErr, logWarn, COLORS } from "../../lib/logger.js";
import { sanitizeText, removeContractions } from "../../lib/helpers.js";
import { DATA_DIR, saveEntryToJSON, loadJSON } from "../../lib/storage.js";
import { generateReplyFromGrok } from "../../services/aiService.js";

const cysEmoji = [
  ":CysicSymbol_Coloronwhite2x:",
  ":0009_pepeLove:",
  ":pepe_pray:",
  " :pogcat:",
  ":pplove:",
  ":cat_hehe:",
  ":1831hilariousstickersgg:",
  ":mad_fire_MAD_crazy:",
  ":boredom_is_legitness:",
  ":Lol:",
  ":iyeey:",
  ":elmo_fire:",
  ":poggersanimated:",
  ":burn:",
  ":23:",
  ":tea~1:",
];

function registerDiscordReplyRoute(app) {
  app.post("/generate-discord", async (req, res) => {
    const { caption, roomId, komentar = [] } = req.body;

    if (!caption || !roomId) {
      logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} Missing caption/roomId on /generate-discord`);
      return res.status(400).json({ error: "caption and roomId are required" });
    }

    let tambahan = "";
    let kodeEmoji = [];

    if (roomId === "cys") {
      kodeEmoji = cysEmoji;
      tambahan = "gmsor adalah sapaan, kalau ada yang menanyakan tentang role suruh akses ke #🎯｜cysic-role";
    }

    const jsonPath = path.join(DATA_DIR, `${roomId}.json`);
    logInfo(`${COLORS.cyan}${req._id}${COLORS.reset} 💬 Komentar (Discord): ${COLORS.gray}${komentar.length} items${COLORS.reset}`);

    const newEntry = { caption, komentar };
    saveEntryToJSON(jsonPath, newEntry);

    const history = loadJSON(jsonPath);
    const historyText = history
      .slice(-10)
      .map((entry, idx) => {
        const cleanedCaption = sanitizeText(entry.caption);
        const kom =
          entry.komentar?.map((k, i) => `${i + 1}. ${k.username}: ${sanitizeText(k.reply)}`).join("\n") || "";
        return `## Example ${idx + 1}\nMessage: "${cleanedCaption}"\nReplies:\n${kom}`;
      })
      .join("\n\n");

    const prompt = `
You are a friendly Discord user active in the "${roomId}" community.
Always reply naturally, casual, and conversational, never robotic or template-like.

Language Rules:

Detect the language of the new message automatically.

ALWAYS reply in the same language as the new message.

Do not switch languages unless explicitly asked to translate.

If Indonesian, use casual daily chat style, not formal or textbook.

In all languages, keep the tone relaxed, informal, and sincere.

Task:

Write ONE short authentic reply to the new message.

Maximum 12 words, single sentence only.

Do not copy the message or conversation history.

Do not use the symbols — or -.

No lists, no extra lines.

Emojis allowed only if they feel natural and match this set: ${JSON.stringify(kodeEmoji)}.

English-Specific Style Rules:

Use casual learner-style English with slight imperfections.

You may use u, ur, cuz, tho occasionally.

NEVER use contractions with apostrophe s.

NEVER use the word sound in any form.

Keep it friendly, simple, and genuine.

Context:

Recent replies: ${historyText || "(no history yet)"}

New message: "${caption}"

Output:
One sentence reply only, max 12 words.
`;

    const spinner = startSpinner(`${req._id} /generate-discord`, "AI thinking");
    try {
      const rawReply = await generateReplyFromGrok(prompt);
      const reply = removeContractions(rawReply);
      const elapsed = Date.now() - req._t0;

      const trimmed = reply?.trim() || "";
      const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
      const hasSoundWord = /\b(sound|sounds|sounding|sounded)\b/i.test(trimmed);

      if (
        !trimmed ||
        trimmed.length < 5 ||
        trimmed.includes(caption.trim()) ||
        wordCount > 12 ||
        hasSoundWord
      ) {
        spinner.stop(false, `${COLORS.red}invalid reply${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
        return res.status(500).json({ error: "Reply not valid" });
      }

      spinner.stop(true, `${COLORS.green}ok${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
      logOk(`${COLORS.cyan}${req._id}${COLORS.reset} Discord reply: ${COLORS.gray}"${trimmed}"${COLORS.reset}`);
      res.json({ reply: trimmed });
    } catch (err) {
      const elapsed = Date.now() - req._t0;
      spinner.stop(false, `${COLORS.red}error${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
      logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (Discord): ${err?.message || err}`);
      res.status(500).json({ error: "Gagal generate konten Discord" });
    }
  });
}

export { registerDiscordReplyRoute };

