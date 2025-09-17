import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = 3000;
app.use(cors());
app.use(bodyParser.json());

// === Setup Grok AI (xAI) ===
const openai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

// === Setup folder data
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// ============== Fancy Console Utils (no deps) ==============
const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  gray: "\x1b[90m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function ts() {
  return new Date().toISOString();
}

function randId(len = 4) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function logInfo(msg) {
  console.log(`${COLORS.blue}ℹ${COLORS.reset} ${COLORS.dim}[${ts()}]${COLORS.reset} ${msg}`);
}
function logWarn(msg) {
  console.log(`${COLORS.yellow}⚠${COLORS.reset} ${COLORS.dim}[${ts()}]${COLORS.reset} ${msg}`);
}
function logOk(msg) {
  console.log(`${COLORS.green}✔${COLORS.reset} ${COLORS.dim}[${ts()}]${COLORS.reset} ${msg}`);
}
function logErr(msg) {
  console.error(`${COLORS.red}✖${COLORS.reset} ${COLORS.dim}[${ts()}]${COLORS.reset} ${msg}`);
}

// Spinner per-request
function startSpinner(prefix, text = "AI thinking") {
  const frames = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
  let i = 0;
  const linePrefix = `${COLORS.cyan}${prefix}${COLORS.reset} ${COLORS.dim}${text}...${COLORS.reset} `;
  const interval = setInterval(() => {
    const frame = frames[i = (i + 1) % frames.length];
    process.stdout.write(`\r${linePrefix}${COLORS.magenta}${frame}${COLORS.reset}  `);
  }, 80);

  const stop = (ok = true, endText = "done") => {
    clearInterval(interval);
    // clear line then print final message
    process.stdout.write("\r\x1b[2K"); // clear line
    const icon = ok ? `${COLORS.green}✔${COLORS.reset}` : `${COLORS.red}✖${COLORS.reset}`;
    console.log(`${icon} ${COLORS.dim}[${ts()}]${COLORS.reset} ${COLORS.cyan}${prefix}${COLORS.reset} ${endText}`);
  };

  return { stop };
}

// ============== Sanitizers & Storage ==============
function sanitizeText(text) {
  return text.replace(/"/g, "").replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

function loadJSON(jsonPath) {
  try {
    if (fs.existsSync(jsonPath)) {
      const raw = fs.readFileSync(jsonPath, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    logWarn(`Gagal membaca file JSON: ${COLORS.gray}${jsonPath}${COLORS.reset}`);
  }
  return [];
}

function saveEntryToJSON(jsonPath, newEntry) {
  const existing = loadJSON(jsonPath);
  existing.push(newEntry);
  fs.writeFileSync(jsonPath, JSON.stringify(existing, null, 2), "utf-8");
}

// ============== OpenAI wrapper ==============
async function generateReplyFromGrok(prompt) {
  const completion = await openai.chat.completions.create({
    model: "grok-code-fast-1",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });
  return completion.choices[0].message.content;
}

// ============== Pretty Startup Log ==============
logOk(`Server booting on ${COLORS.bold}http://localhost:${PORT}${COLORS.reset}`);
logInfo(`Data dir: ${COLORS.gray}${DATA_DIR}${COLORS.reset}`);
logInfo(`xAI base URL: ${COLORS.gray}${openai.baseURL || "https://api.x.ai/v1"}${COLORS.reset}`);

// Middleware: attach reqId + start time
app.use((req, _res, next) => {
  req._id = `REQ-${randId()}`;
  req._t0 = Date.now();
  logInfo(`${COLORS.cyan}${req._id}${COLORS.reset} ${COLORS.bold}${req.method}${COLORS.reset} ${req.url}`);
  next();
});

// === Endpoint Twitter/X
app.post("/generate", async (req, res) => {
  const { caption, roomId, komentar = [] } = req.body;
  if (!caption || !roomId) {
    logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} Missing caption/roomId on /generate`);
    return res.status(400).json({ error: "caption and roomId are required" });
  }

  const jsonPath = path.join(DATA_DIR, `${roomId}.json`);
  logInfo(`${COLORS.cyan}${req._id}${COLORS.reset} 💬 Komentar (Twitter): ${COLORS.gray}${komentar.length} items${COLORS.reset}`);

  // Simpan sample & history
  const newEntry = { caption, komentar };
  saveEntryToJSON(jsonPath, newEntry);

  const history = loadJSON(jsonPath);
  const historyText = history
    .slice(-20)
    .map((entry, idx) => {
      const cleanedCaption = sanitizeText(entry.caption);
      const kom =
        entry.komentar
          ?.map((k, i) => `${i + 1}. @${k.username}: ${sanitizeText(k.reply)}`)
          .join("\n") || "";
      return `## Example ${idx + 1}\nCaption: "${cleanedCaption}"\nReplies:\n${kom}`;
    })
    .join("\n\n");

  const prompt = `
You are a friendly user in the "${roomId}" community. Always natural, casual, and short. Never robotic or template.

Task:
Write ONE short and authentic reply to the new tweet below.
Max 1 sentence, no paragraphs.
Do NOT copy the tweet or history.
Do NOT use symbols — or -.
Keep it simple, natural, and human, like a normal person chatting.
It can be a short reaction ("Nice work!", "Congrats!") OR a short reaction followed by a light, relevant question ("Looks great, when’s the next one?", "Well done, how long did this take?").
Emojis are fine only if they fit naturally. Avoid generic 🚀🔥💎🙌.

Examples of good replies:
"Nice work, how did you come up with this?"
"Congrats! what’s next?"
"Looks great, did you make it yourself?"
"Thanks for sharing, where can I read more?"
"Well done, how long did it take?"
"Appreciate this, any tips for others?"
"All good here, how’s your side?"

Recent replies:
${historyText || "(no history yet)"}

New tweet:
"${caption}"

Your reply (1 sentence, natural and simple, short reaction + optional light question):

`;

  const spinner = startSpinner(`${req._id} /generate`, "AI thinking");
  try {
    const reply = await generateReplyFromGrok(prompt);
    const elapsed = Date.now() - req._t0;

    if (!reply || reply.trim().length < 5 || reply.includes(caption.trim())) {
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

// === Endpoint Discord
app.post("/generate-discord", async (req, res) => {
  const { caption, roomId, komentar = [] } = req.body;
  if (!caption || !roomId) {
    logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} Missing caption/roomId on /generate-discord`);
    return res.status(400).json({ error: "caption and roomId are required" });
  }
  let tambahan = "";
  let kodeEmoji = [];
  const cysEmoji = [
    ":CysicSymbol_Coloronwhite2x:",
    ":0009_pepeLove:",
    ":pepe_pray:",
    " :pogcat:",
    ":pplove:",
    ":cat_hehe:",
    ":1831hilariousstickersgg:",
  ];

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
        entry.komentar
          ?.map((k, i) => `${i + 1}. ${k.username}: ${sanitizeText(k.reply)}`)
          .join("\n") || "";
      return `## Example ${idx + 1}\nMessage: "${cleanedCaption}"\nReplies:\n${kom}`;
    })
    .join("\n\n");

  const prompt = `
You are a friendly Discord user in the "${roomId}" community. Always natural, casual, and short. Never robotic, never template.

Your task:
Write ONE short and authentic reply to the new message below.
Max 1 sentence.
Do not copy the message or history.
Do not use the symbols — or -.
No need for slang, just talk like a normal person in chat.
Keep it friendly, clear, and simple.
Emojis are fine if they fit naturally or are from the community set: ${JSON.stringify(kodeEmoji)}. Avoid generic 🚀🔥🙌💎.

Examples of good replies:
"I'm good, how are you?"
"Fine, thanks for asking"
"All good here"
"Thanks, I appreciate it"
"Just relaxing right now"
"Glad to see you here"

Recent replies:
${historyText || "(no history yet)"}

New message:
"${caption}"

Your reply (1 sentence, natural and simple):

${tambahan}

`;

  const spinner = startSpinner(`${req._id} /generate-discord`, "AI thinking");
  try {
    const reply = await generateReplyFromGrok(prompt);
    const elapsed = Date.now() - req._t0;

    if (!reply || reply.trim().length < 5 || reply.includes(caption.trim())) {
      spinner.stop(false, `${COLORS.red}invalid reply${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
      return res.status(500).json({ error: "Reply not valid" });
    }

    spinner.stop(true, `${COLORS.green}ok${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
    logOk(`${COLORS.cyan}${req._id}${COLORS.reset} Discord reply: ${COLORS.gray}"${reply.trim()}"${COLORS.reset}`);
    res.json({ reply });
  } catch (err) {
    const elapsed = Date.now() - req._t0;
    spinner.stop(false, `${COLORS.red}error${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
    logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (Discord): ${err?.message || err}`);
    res.status(500).json({ error: "Gagal generate konten Discord" });
  }
});

// === Generate Topic (Discord)
// Body: { roomId: string, hint?: string, examples: Array<{username, reply}> }
// === Generate Topic (Discord) — versi "conversation topics"
// === Generate Topic (Discord) — SINGLE SHORT OPENER (one message only)
app.post("/generate-topic", async (req, res) => {
  const { roomId, hint = "", examples = [] } = req.body || {};
  const spinner = startSpinner(`${req._id} /generate-topic`, "AI thinking");

  try {
    if (!roomId) {
      spinner.stop(false, `${COLORS.red}bad request${COLORS.reset}`);
      return res.status(400).json({ error: "roomId is required" });
    }

    // Ambil maksimal 10 pesan sekitar sebagai konteks
    const sample = (Array.isArray(examples) ? examples : []).slice(0, 10);
    const sampleText = sample
      .map((m, i) => `${i + 1}. ${m.username}: ${sanitizeText(m.reply || "")}`)
      .join("\n");

    // Kosakata komunitas (opsional)
    const COMMUNITY_VOCAB = {
      cys: ["Cysors", "gmsor", "fam", "gm", "wen", "zk"],
      mmt: ["MMT", "fam", "gm"],
      fgo: ["Fogo", "gm", "fam"],
      rialo: ["Rialo", "gm", "fam"],
      fastTest: ["gm", "fam"],
    };
    const vocab = COMMUNITY_VOCAB[roomId] || ["gm", "fam"];

    // Prompt: hasil HARUS satu kalimat pendek saja, tanpa koma, tanpa list
    const prompt = `
You create ONE MICRO-OPENER for a Discord chat in the "${roomId}" community.

Requirements:
- Output EXACTLY ONE short topic starter (2–8 words), natural and casual.
- It should be something a user can send as a single message (e.g., greet, quick check-in, simple ask, light invite).
- If natural, you may use community vocabulary: ${vocab.join(", ")}.
- No emojis, no usernames, no hashtags, no links.
- Do NOT use the symbols — or - anywhere.
- Do NOT use commas. Do NOT output multiple sentences. One sentence only.
- Match the vibe of recent messages.

Output format:
- ONE line only, the message itself.
- No quotes, no bullets, no numbering, no extra text, no line breaks.

Style example (do NOT copy literally):
How are you doing?

Recent messages:
${sampleText || "(no messages)"}

Optional user hint (may be empty):
${sanitizeText(hint)}

Now output exactly ONE short message (2–8 words), no commas.
`.trim();

    const raw = await generateReplyFromGrok(prompt) || "";

    // Normalisasi ke satu kalimat pendek
    let line = raw.replace(/[\r\n]+/g, " ").trim();
    line = line.replace(/^["'“”`]+|["'“”`]+$/g, "");   // buang kutip pembungkus
    line = line.replace(/[—-]+/g, " ");                 // larang em-dash/hyphen → spasi
    line = line.replace(/\s+/g, " ").trim();

    // Validasi: satu pesan saja, tanpa koma, panjang wajar
    const wordCount = line ? line.split(/\s+/).length : 0;
    const invalid = !line || /,/.test(line) || wordCount < 2 || wordCount > 8;

    if (invalid) {
      // fallback sederhana per-room
      const FALLBACK = {
        cys: "How are you doing?",
        mmt: "How are you doing?",
        fgo: "What’s good today?",
        rialo: "How are you doing?",
        fastTest: "How are you doing?",
        default: "How are you doing?",
      };
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



// === Parafrase (perbaiki bahasa Inggris)
app.post("/generate-parafrase", async (req, res) => {
  const spinner = startSpinner(`${req._id} /generate-parafrase`, "AI thinking");
  try {
    const { text } = req.body || {};
    if (!text || !text.trim()) {
      spinner.stop(false, `${COLORS.red}bad request${COLORS.reset}`);
      return res.status(400).json({ error: "text is required" });
    }

    const prompt = `
You are an expert editor for Discord chat. Rewrite the user's message in **natural, concise, friendly English**.
- Keep the original meaning and tone.
- Improve grammar, word choice, and flow.
- Keep it short (one sentence if possible).
- No emojis unless they were already present.
- Output only the improved sentence, nothing else.

Original: "${sanitizeText(text)}"
Rewritten:
    `.trim();

    const improved = await generateReplyFromGrok(prompt);
    spinner.stop(true, `${COLORS.green}ok${COLORS.reset}`);
    return res.json({ text: improved?.trim() || "" });
  } catch (err) {
    spinner.stop(false, `${COLORS.red}error${COLORS.reset}`);
    logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (/generate-parafrase): ${err?.message || err}`);
    return res.status(500).json({ error: "Failed to paraphrase" });
  }
});

// === Translate ID ➜ EN
app.post("/generate-translate", async (req, res) => {
  const spinner = startSpinner(`${req._id} /generate-translate`, "AI thinking");
  try {
    const { text } = req.body || {};
    if (!text || !text.trim()) {
      spinner.stop(false, `${COLORS.red}bad request${COLORS.reset}`);
      return res.status(400).json({ error: "text is required" });
    }

    const prompt = `
Translate the following from **Bahasa Indonesia** into **natural, conversational English** suitable for Discord.
- Keep it concise.
- Preserve intent and nuance.
- No explanation, no notes, output text only.

Indonesian: "${sanitizeText(text)}"
English:
    `.trim();

    const translated = await generateReplyFromGrok(prompt);
    spinner.stop(true, `${COLORS.green}ok${COLORS.reset}`);
    return res.json({ text: translated?.trim() || "" });
  } catch (err) {
    spinner.stop(false, `${COLORS.red}error${COLORS.reset}`);
    logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (/generate-translate): ${err?.message || err}`);
    return res.status(500).json({ error: "Failed to translate" });
  }
});

app.listen(PORT, () => {
  logOk(`Server aktif di ${COLORS.bold}http://localhost:${PORT}${COLORS.reset}`);
});
