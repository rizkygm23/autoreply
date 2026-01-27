import path from "path";
import { startSpinner, logInfo, logOk, logErr, logWarn, COLORS } from "../../lib/logger.js";
import { sanitizeText, removeContractions } from "../../lib/helpers.js";
import { DATA_DIR, saveEntryToJSON, loadJSON } from "../../lib/storage.js";
import { generateReplyFromGrok } from "../../services/aiService.js";

// 0-9 Time-based variations for Twitter Replies
const TWITTER_REPLY_EXAMPLES = {
  0: [
    "- \"thats sick\"",
    "- \"real, same here\"",
    "- \"ngl sounds bad\"",
    "- \"aight makes sense\""
  ],
  1: [
    "- \"wait fr?\"",
    "- \"nice one man\"",
    "- \"lmao true tho\"",
    "- \"no way fr\""
  ],
  2: [
    "- \"damn thats tough\"",
    "- \"thats wild\"",
    "- \"thats crazy\"",
    "- \"fr? didnt know that\""
  ],
  3: [
    "- \"solid choice bro\"",
    "- \"respect for that\"",
    "- \"valid point tbh\"",
    "- \"i feel u man\""
  ],
  4: [
    "- \"haha classic\"",
    "- \"lol basically yeah\"",
    "- \"never gets old\"",
    "- \"typical fr\""
  ],
  5: [
    "- \"congrats man\"",
    "- \"big win bro\"",
    "- \"big moves only\"",
    "- \"keep working hard\""
  ],
  6: [
    "- \"wait what?\"",
    "- \"yo serious?\"",
    "- \"bruh moment fr\"",
    "- \"thats actually wild\""
  ],
  7: [
    "- \"energy is crazy\"",
    "- \"chill energy only\"",
    "- \"mood rn tbh\"",
    "- \"same energy bro\""
  ],
  8: [
    "- \"explain pls\"",
    "- \"wait how so?\"",
    "- \"u sure about that?\"",
    "- \"curious why tho\""
  ],
  9: [
    "- \"fair enough man\"",
    "- \"yeah makes sense\"",
    "- \"solid tbh\"",
    "- \"agreed 100%\""
  ]
};

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

    // Time-based variation (0-9)
    const secondDigit = new Date().getSeconds() % 10;
    const examples = TWITTER_REPLY_EXAMPLES[secondDigit].join("\n");

    const prompt = `
You are a friendly, real Twitter user in the "${roomId}" community.
Current Mode: reply

Task:
Reply to the tweet below using the "casual bro" style.
One complete sentence only.
MAXIMUM 5-8 WORDS.

Context:
Recent replies: ${historyText || "(no history yet)"}
New tweet: "${caption}"

CRITICAL RULES:
1. MAXIMUM 5-8 WORDS ONLY. Super short.
2. lowercase only, casual bro vibes
3. slang: u, ur, tho, btw, rn, ngl, tbh, bro, fr
4. AVOID starting with "yo" every time. Use variety.
5. NO emojis, NO period at end
6. ONE simple response only
7. ONLY respond to what they said - do NOT add random stuff
8. DO NOT describe activities like "pushing through" or "staying productive"
9. DO NOT make up context that wasn't in their message
10. USE SIMPLE ENGLISH. Avoid complex idioms.
11. BLACKLIST (DO NOT USE): vibing, vibe, vibes, holding up, rollin, grinding, hustle, sheesh, finna, boutta, cap, no cap, bet, cooked

GOOD EXAMPLES (casual bro style):
${examples}

BAD (adding random stuff - NEVER do this):
- "nice bro, pushing through the afternoon" (don't add random activities)
- "solid, staying productive today" (don't make up what they're doing)
- "that's definitely an interesting point" (too formal)
- "vibes are immaculate" (banned word: vibes)

OUTPUT: Only the short casual reply, nothing else.
`;

    const spinner = startSpinner(`${req._id} /generate`, "AI thinking");
    try {
      const aiResponse = await generateReplyFromGrok(prompt);
      const reply = removeContractions(aiResponse.content);
      const elapsed = Date.now() - req._t0;

      const trimmed = reply?.trim() || "";


      if (
        !trimmed ||
        trimmed.length < 5 ||
        trimmed.includes(caption.trim())
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


