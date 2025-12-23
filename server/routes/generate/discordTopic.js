import { startSpinner, logErr, COLORS } from "../../lib/logger.js";
import { sanitizeText, removeContractions } from "../../lib/helpers.js";
import { generateReplyFromGrok } from "../../services/aiService.js";

const COMMUNITY_VOCAB = {
  cys: ["Cysors", "gmsor", "fam", "gm", "wen", "zk"],
  mmt: ["MMT", "fam", "gm"],
  fgo: ["Fogo", "gm", "fam"],
  rialo: ["Rialo", "gm", "fam"],
  fastTest: ["gm", "fam"],
};

const FALLBACK = {
  cys: "How are you doing?",
  mmt: "How are you doing?",
  fgo: "What is good today?",
  rialo: "How are you doing?",
  fastTest: "How are you doing?",
  default: "How are you doing?",
};

function registerDiscordTopicRoute(app) {
  app.post("/generate-topic", async (req, res) => {
    const { roomId, hint = "", examples = [] } = req.body || {};
    const spinner = startSpinner(`${req._id} /generate-topic`, "AI thinking");

    try {
      if (!roomId) {
        spinner.stop(false, `${COLORS.red}bad request${COLORS.reset}`);
        return res.status(400).json({ error: "roomId is required" });
      }

      const sample = (Array.isArray(examples) ? examples : []).slice(0, 10);
      const sampleText = sample.map((m, i) => `${i + 1}. ${m.username}: ${sanitizeText(m.reply || "")}`).join("\n");
      const vocab = COMMUNITY_VOCAB[roomId] || ["gm", "fam"];

      const prompt = `
You create ONE micro opener for a Discord chat in the "${roomId}" community.

Task:

Output EXACTLY ONE short topic starter

Length must be 2–8 words

It must feel natural casual and human

Something a normal user would send as a single message

Examples include a greeting quick check in simple ask or light invite

Match the vibe of recent messages

If natural you may use community vocabulary: ${vocab.join(", ")}

Strict Rules:

ONE sentence only

No commas

No emojis

No usernames hashtags or links

Do NOT use the symbols — or - anywhere

Do NOT output multiple options

Do NOT add explanations or extra text

English Language Rules:

NEVER use contractions with apostrophe s

ALWAYS use full forms like what is how is it is

Avoid apostrophes in contractions entirely

Keep phrasing conversational and natural

Context:

Recent messages: ${sampleText || "(no messages)"}

Optional user hint: ${sanitizeText(hint)}

Output:
One line only containing the message itself.
`.trim();

      const raw = await generateReplyFromGrok(prompt);

      let line = raw.replace(/[\r\n]+/g, " ").trim();
      line = line.replace(/^["'`]+|["'`]+$/g, "");
      line = line.replace(/[—-]+/g, " ");
      line = line.replace(/\s+/g, " ").trim();
      line = removeContractions(line);

      const wordCount = line ? line.split(/\s+/).length : 0;
      const invalid = !line || /,/.test(line) || wordCount < 2 || wordCount > 8;

      if (invalid) {
        line = FALLBACK[roomId] || FALLBACK.default;
      }

      spinner.stop(true, `${COLORS.green}ok${COLORS.reset}`);
      return res.json({ topic: line });
    } catch (err) {
      spinner.stop(false, `${COLORS.red}error${COLORS.reset}`);
      logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (/generate-topic): ${err?.message || err}`);
      return res.status(500).json({ error: "Failed to generate topic" });
    }
  });
}

export { registerDiscordTopicRoute };

