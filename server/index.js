import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import OpenAI from "openai";
import { createClient } from '@supabase/supabase-js';

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

// === Setup Supabase ===
const supabaseUrl = process.env.SUPABASE_URL || 'https://avtaghpbnasdxmjnahxc.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2dGFnaHBibmFzZHhtam5haHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA5NzU2ODcsImV4cCI6MjA0NjU1MTY4N30.msS8vrExcOUqW70DDMQ0KumXWMuBRpy7jlaU4wIEuLg';
const supabase = createClient(supabaseUrl, supabaseKey);

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

// ============== Token Estimation Functions ==============

// === Token Estimation ===
function estimateTokens(text) {
  if (!text) return 0;
  // Estimasi kasar: 1 token ≈ 4 karakter untuk bahasa Indonesia/Inggris
  return Math.ceil(text.length / 4);
}

function estimateRequestTokens(prompt, roomData, userRoom) {
  let totalTokens = 0;
  
  // Prompt tokens
  totalTokens += estimateTokens(prompt);
  
  // Room data tokens (jika ada)
  if (roomData && typeof roomData === 'object') {
    const roomDataText = JSON.stringify(roomData);
    totalTokens += estimateTokens(roomDataText);
  }
  
  // User room tokens
  if (userRoom && Array.isArray(userRoom)) {
    const userRoomText = userRoom.join(' ');
    totalTokens += estimateTokens(userRoomText);
  }
  
  return totalTokens;
}

// ============== Supabase Database Functions ==============

// === User Management ===
async function createUser(email, password, roomData = {}) {
  try {
    const defaultRooms = [
      "rialo",
      "lighter",
      "creek",
      "cys",
      "town"
    ];
    const defaultRoomData = {};
    
    // Load room data from files
    for (const room of defaultRooms) {
      try {
        const roomFilePath = path.join(DATA_DIR, `${room}.json`);
        if (fs.existsSync(roomFilePath)) {
          const roomContent = fs.readFileSync(roomFilePath, 'utf-8');
          defaultRoomData[room] = JSON.parse(roomContent);
        }
      } catch (err) {
        console.warn(`Failed to load room data for ${room}:`, err.message);
      }
    }

    const { data, error } = await supabase
      .from('user')
      .insert({
        user_mail: email,
        user_password: password, // Store password
        user_room: defaultRooms,
        user_room_data: { ...defaultRoomData, ...roomData },
        user_token: 200000 // Free 200k tokens
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('User already exists');
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

async function getUserByEmail(email) {
  try {
    const { data, error } = await supabase
      .from('user')
      .select('*')
      .eq('user_mail', email)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

async function authenticateUser(email, password) {
  try {
    const { data, error } = await supabase
      .from('user')
      .select('*')
      .eq('user_mail', email)
      .eq('user_password', password)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error authenticating user:', error);
    throw error;
  }
}

async function getUserById(userId) {
  try {
    const { data, error } = await supabase
      .from('user')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
}

// === Token Management ===
async function checkUserTokens(userId, requiredTokens) {
  try {
    const { data, error } = await supabase
      .rpc('check_user_tokens', {
        p_user_id: userId,
        p_required_tokens: requiredTokens
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error checking user tokens:', error);
    return false;
  }
}

async function deductUserTokens(userId, tokensToDeduct) {
  try {
    const { data, error } = await supabase
      .rpc('deduct_user_tokens', {
        p_user_id: userId,
        p_tokens_to_deduct: tokensToDeduct
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error deducting user tokens:', error);
    return false;
  }
}

async function addUserTokens(userId, tokensToAdd) {
  try {
    const { data, error } = await supabase
      .rpc('add_user_tokens', {
        p_user_id: userId,
        p_tokens_to_add: tokensToAdd
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding user tokens:', error);
    return false;
  }
}

// === Token Usage Logging ===
async function logTokenUsage(userId, tokenUsage, aiResponse, endpoint, roomId, requestData, responseData, processingTime, req = null) {
  try {
    // Fixed token usage per request
    const actualTokens = 4000;
    
    const { data, error } = await supabase
      .from('token_ai_usage')
      .insert({
        user_id: userId,
        token_usage: actualTokens,
        ai_response: aiResponse,
        status_request: 'success',
        endpoint: endpoint,
        room_id: roomId,
        request_data: { ...requestData, fixedTokens: actualTokens },
        response_data: responseData,
        processing_time_ms: processingTime,
        ip_address: req?.ip || null,
        user_agent: req?.get('User-Agent') || null
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error logging token usage:', error);
    // Don't throw error here as it shouldn't break the main flow
  }
}

// === Payment Management ===
async function createPayment(userId, txHash, dollarValue, tokenValue) {
  try {
    const { data, error } = await supabase
      .from('payment')
      .insert({
        user_id: userId,
        arbitrum_txhash: txHash,
        valueDollar: dollarValue,
        valueToken: tokenValue,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
}

async function confirmPayment(txHash) {
  try {
    const { data, error } = await supabase
      .from('payment')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      })
      .eq('arbitrum_txhash', txHash)
      .select()
      .single();

    if (error) throw error;
    
    // Add tokens to user
    if (data) {
      await addUserTokens(data.user_id, data.valueToken);
    }
    
    return data;
  } catch (error) {
    console.error('Error confirming payment:', error);
    throw error;
  }
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

// ============== Post-processing to remove contractions ==============
function removeContractions(text) {
  if (!text) return text;
  
  // Common contractions to replace
  const contractions = {
    "what's": "what is",
    "how's": "how is", 
    "when's": "when is",
    "where's": "where is",
    "who's": "who is",
    "it's": "it is",
    "that's": "that is",
    "here's": "here is",
    "there's": "there is",
    "I'm": "I am",
    "you're": "you are",
    "we're": "we are",
    "they're": "they are",
    "he's": "he is",
    "she's": "she is",
    "let's": "let us",
    "can't": "cannot",
    "won't": "will not",
    "don't": "do not",
    "doesn't": "does not",
    "didn't": "did not",
    "hasn't": "has not",
    "haven't": "have not",
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not"
  };
  
  let result = text;
  
  // Replace contractions (case-insensitive)
  Object.entries(contractions).forEach(([contraction, fullForm]) => {
    const regex = new RegExp(`\\b${contraction.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    result = result.replace(regex, fullForm);
  });
  
  return result;
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

// ============== Authentication Endpoints ==============

// === Register User ===
app.post("/auth/register", async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} Missing email or password on /auth/register`);
    return res.status(400).json({ error: "Email and password are required" });
  }

  const spinner = startSpinner(`${req._id} /auth/register`, "Creating user");
  try {
    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      spinner.stop(false, `${COLORS.yellow}user exists${COLORS.reset}`);
      return res.status(409).json({ 
        error: "User already exists",
        user: {
          user_id: existingUser.user_id,
          user_mail: existingUser.user_mail,
          user_token: existingUser.user_token,
          user_room: existingUser.user_room
        }
      });
    }

    // Create new user
    const newUser = await createUser(email, password);
    
    spinner.stop(true, `${COLORS.green}created${COLORS.reset}`);
    logOk(`${COLORS.cyan}${req._id}${COLORS.reset} New user created: ${COLORS.gray}${email}${COLORS.reset}`);
    
    res.json({
      success: true,
      user: {
        user_id: newUser.user_id,
        user_mail: newUser.user_mail,
        user_token: newUser.user_token,
        user_room: newUser.user_room,
        user_room_data: newUser.user_room_data
      }
    });
  } catch (error) {
    const elapsed = Date.now() - req._t0;
    spinner.stop(false, `${COLORS.red}error${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
    logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (Register): ${error.message}`);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// === Login User ===
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} Missing email or password on /auth/login`);
    return res.status(400).json({ error: "Email and password are required" });
  }

  const spinner = startSpinner(`${req._id} /auth/login`, "Authenticating");
  try {
    const user = await authenticateUser(email, password);
    
    if (!user) {
      spinner.stop(false, `${COLORS.red}invalid credentials${COLORS.reset}`);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    spinner.stop(true, `${COLORS.green}success${COLORS.reset}`);
    logOk(`${COLORS.cyan}${req._id}${COLORS.reset} User login: ${COLORS.gray}${email}${COLORS.reset}`);
    
    res.json({
      success: true,
      user: {
        user_id: user.user_id,
        user_mail: user.user_mail,
        user_token: user.user_token,
        user_room: user.user_room,
        user_room_data: user.user_room_data
      }
    });
  } catch (error) {
    const elapsed = Date.now() - req._t0;
    spinner.stop(false, `${COLORS.red}error${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
    logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (Login): ${error.message}`);
    res.status(500).json({ error: "Failed to authenticate user" });
  }
});

// === Get User Info ===
app.get("/auth/user/:userId", async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  const spinner = startSpinner(`${req._id} /auth/user`, "Fetching user");
  try {
    const user = await getUserById(parseInt(userId));
    
    if (!user) {
      spinner.stop(false, `${COLORS.red}not found${COLORS.reset}`);
      return res.status(404).json({ error: "User not found" });
    }

    spinner.stop(true, `${COLORS.green}success${COLORS.reset}`);
    
    res.json({
      success: true,
      user: {
        user_id: user.user_id,
        user_mail: user.user_mail,
        user_token: user.user_token,
        user_room: user.user_room,
        user_room_data: user.user_room_data,
        created_at: user.created_at
      }
    });
  } catch (error) {
    const elapsed = Date.now() - req._t0;
    spinner.stop(false, `${COLORS.red}error${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
    logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (Get User): ${error.message}`);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// === Payment Endpoints ===
app.post("/payment/create", async (req, res) => {
  const { userId, txHash, dollarValue, tokenValue } = req.body;
  
  if (!userId || !txHash || !dollarValue || !tokenValue) {
    return res.status(400).json({ error: "All payment fields are required" });
  }

  if (dollarValue < 5) {
    return res.status(400).json({ error: "Minimum payment is $5" });
  }

  const spinner = startSpinner(`${req._id} /payment/create`, "Creating payment");
  try {
    const payment = await createPayment(userId, txHash, dollarValue, tokenValue);
    
    spinner.stop(true, `${COLORS.green}created${COLORS.reset}`);
    logOk(`${COLORS.cyan}${req._id}${COLORS.reset} Payment created: ${COLORS.gray}${txHash}${COLORS.reset}`);
    
    res.json({
      success: true,
      payment: {
        id: payment.id,
        arbitrum_txhash: payment.arbitrum_txhash,
        valueDollar: payment.valueDollar,
        valueToken: payment.valueToken,
        status: payment.status
      }
    });
  } catch (error) {
    const elapsed = Date.now() - req._t0;
    spinner.stop(false, `${COLORS.red}error${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
    logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (Create Payment): ${error.message}`);
    res.status(500).json({ error: "Failed to create payment" });
  }
});

app.post("/payment/confirm", async (req, res) => {
  const { txHash } = req.body;
  
  if (!txHash) {
    return res.status(400).json({ error: "Transaction hash is required" });
  }

  const spinner = startSpinner(`${req._id} /payment/confirm`, "Confirming payment");
  try {
    const payment = await confirmPayment(txHash);
    
    if (!payment) {
      spinner.stop(false, `${COLORS.red}not found${COLORS.reset}`);
      return res.status(404).json({ error: "Payment not found" });
    }
    
    spinner.stop(true, `${COLORS.green}confirmed${COLORS.reset}`);
    logOk(`${COLORS.cyan}${req._id}${COLORS.reset} Payment confirmed: ${COLORS.gray}${txHash}${COLORS.reset}`);
    
    res.json({
      success: true,
      payment: {
        id: payment.id,
        arbitrum_txhash: payment.arbitrum_txhash,
        valueDollar: payment.valueDollar,
        valueToken: payment.valueToken,
        status: payment.status,
        confirmed_at: payment.confirmed_at
      }
    });
  } catch (error) {
    const elapsed = Date.now() - req._t0;
    spinner.stop(false, `${COLORS.red}error${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
    logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (Confirm Payment): ${error.message}`);
    res.status(500).json({ error: "Failed to confirm payment" });
  }
});

// ============== Enhanced AI Endpoints with Authentication ==============

// === Endpoint Twitter/X
app.post("/generate", async (req, res) => {
  const { caption, roomId, komentar = [], userId } = req.body;
  
  if (!caption || !roomId) {
    logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} Missing caption/roomId on /generate`);
    return res.status(400).json({ error: "caption and roomId are required" });
  }

  if (!userId) {
    logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} Missing userId on /generate`);
    return res.status(400).json({ error: "userId is required for authentication" });
  }

  // Check if user exists and has enough tokens
  const user = await getUserById(userId);
  if (!user) {
    logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} User not found: ${userId}`);
    return res.status(404).json({ error: "User not found" });
  }

  // Fixed token cost per request
  const requiredTokens = 4000; // Fixed cost per AI request
  
  const hasEnoughTokens = await checkUserTokens(userId, requiredTokens);
  if (!hasEnoughTokens) {
    logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} Insufficient tokens for user: ${userId} (needs ${requiredTokens}, has ${user.user_token})`);
    return res.status(402).json({ 
      error: "Insufficient tokens", 
      currentTokens: user.user_token,
      requiredTokens: requiredTokens,
      message: `You need ${requiredTokens} tokens for this request. Please top up your account.`
    });
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
You are a friendly user in the "${roomId}" community. Always natural, casual, and conversational. Never robotic or template-like.

Task:
Write ONE short and authentic reply to the new tweet below.
Max 1 sentence, no paragraphs.
Do NOT copy the tweet or history.
Do NOT use symbols — or -.
Keep it simple, natural, and human, like a normal person chatting.
It can be a short reaction ("Nice work!", "Congrats!") OR a short reaction followed by a light, relevant question ("Looks great, when is the next one?", "Well done, how long did this take?").
Emojis are fine only if they fit naturally. Avoid generic 🚀🔥💎🙌.

IMPORTANT LANGUAGE RULES:
- NEVER use contractions ending with 's (like "what's", "how's", "when's", "where's", "who's", "it's", "that's", "here's", "there's")
- ALWAYS use full forms: "what is", "how is", "when is", "where is", "who is", "it is", "that is", "here is", "there is"
- Use natural, conversational English without apostrophes in contractions
- Keep the tone friendly and genuine

Examples of good replies (following the rules):
"Nice work, how did you come up with this?"
"Congrats! what is next?"
"Looks great, did you make it yourself?"
"Thanks for sharing, where can I read more?"
"Well done, how long did it take?"
"Appreciate this, any tips for others?"
"All good here, how is your side?"
"Great job, what inspired this?"
"Amazing work, how did you learn this?"
"Impressive, what tools did you use?"

Recent replies:
${historyText || "(no history yet)"}

New tweet:
"${caption}"

Your reply (1 sentence, natural and simple, short reaction + optional light question, NO contractions with 's):

`;

  const spinner = startSpinner(`${req._id} /generate`, "AI thinking");
  try {
    const startTime = Date.now();
    const rawReply = await generateReplyFromGrok(prompt);
    const reply = removeContractions(rawReply);
    const elapsed = Date.now() - req._t0;

    if (!reply || reply.trim().length < 5 || reply.includes(caption.trim())) {
      spinner.stop(false, `${COLORS.red}invalid reply${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
      return res.status(500).json({ error: "Reply not valid" });
    }

    // Deduct tokens from user
    const tokenDeductionSuccess = await deductUserTokens(userId, requiredTokens);
    if (!tokenDeductionSuccess) {
      spinner.stop(false, `${COLORS.red}token deduction failed${COLORS.reset}`);
      return res.status(500).json({ error: "Failed to deduct tokens" });
    }

    // Log token usage
    await logTokenUsage(
      userId, 
      requiredTokens, 
      reply, 
      '/generate', 
      roomId, 
      { caption, komentar: komentar.length }, 
      { reply }, 
      elapsed,
      req
    );

    spinner.stop(true, `${COLORS.green}ok${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
    logOk(`${COLORS.cyan}${req._id}${COLORS.reset} X reply: ${COLORS.gray}"${reply.trim()}"${COLORS.reset} | Tokens: ${user.user_token - requiredTokens}`);
    res.json({ 
      reply,
      tokensUsed: requiredTokens,
      remainingTokens: user.user_token - requiredTokens
    });
  } catch (err) {
    const elapsed = Date.now() - req._t0;
    spinner.stop(false, `${COLORS.red}error${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
    logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (Twitter): ${err?.message || err}`);
    res.status(500).json({ error: "Gagal generate konten" });
  }
});

// === Endpoint Discord
app.post("/generate-discord", async (req, res) => {
  const { caption, roomId, komentar = [], userId } = req.body;
  
  if (!caption || !roomId) {
    logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} Missing caption/roomId on /generate-discord`);
    return res.status(400).json({ error: "caption and roomId are required" });
  }

  if (!userId) {
    logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} Missing userId on /generate-discord`);
    return res.status(400).json({ error: "userId is required for authentication" });
  }

  // Check if user exists and has enough tokens
  const user = await getUserById(userId);
  if (!user) {
    logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} User not found: ${userId}`);
    return res.status(404).json({ error: "User not found" });
  }

  // Fixed token cost per request
  const requiredTokens = 4000; // Fixed cost per AI request
  
  const hasEnoughTokens = await checkUserTokens(userId, requiredTokens);
  if (!hasEnoughTokens) {
    logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} Insufficient tokens for user: ${userId} (needs ${requiredTokens}, has ${user.user_token})`);
    return res.status(402).json({ 
      error: "Insufficient tokens", 
      currentTokens: user.user_token,
      requiredTokens: requiredTokens,
      message: `You need ${requiredTokens} tokens for this request. Please top up your account.`
    });
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
You are a friendly Discord user in the "${roomId}" community. Always natural, casual, and conversational. Never robotic, never template-like.

Your task:
Write ONE short and authentic reply to the new message below.
Max 1 sentence.
Do not copy the message or history.
Do not use the symbols — or -.
No need for slang, just talk like a normal person in chat.
Keep it friendly, clear, and simple.
Emojis are fine if they fit naturally or are from the community set: ${JSON.stringify(kodeEmoji)}. Avoid generic 🚀🔥🙌💎.

IMPORTANT LANGUAGE RULES:
- NEVER use contractions ending with 's (like "what's", "how's", "when's", "where's", "who's", "it's", "that's", "here's", "there's", "I'm", "you're", "we're", "they're")
- ALWAYS use full forms: "what is", "how is", "when is", "where is", "who is", "it is", "that is", "here is", "there is", "I am", "you are", "we are", "they are"
- Use natural, conversational English without apostrophes in contractions
- Keep the tone friendly and genuine

Examples of good replies (following the rules):
"I am good, how are you?"
"Fine, thanks for asking"
"All good here"
"Thanks, I appreciate it"
"Just relaxing right now"
"Glad to see you here"
"Great to hear from you"
"What is up today?"
"How is everything going?"
"Nice to see you here"
"Hope you are doing well"
"What brings you here?"

Recent replies:
${historyText || "(no history yet)"}

New message:
"${caption}"

Your reply (1 sentence, natural and simple, NO contractions with 's):

${tambahan}

`;

  const spinner = startSpinner(`${req._id} /generate-discord`, "AI thinking");
  try {
    const startTime = Date.now();
    const rawReply = await generateReplyFromGrok(prompt);
    const reply = removeContractions(rawReply);
    const elapsed = Date.now() - req._t0;

    if (!reply || reply.trim().length < 5 || reply.includes(caption.trim())) {
      spinner.stop(false, `${COLORS.red}invalid reply${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
      return res.status(500).json({ error: "Reply not valid" });
    }

    // Deduct tokens from user
    const tokenDeductionSuccess = await deductUserTokens(userId, requiredTokens);
    if (!tokenDeductionSuccess) {
      spinner.stop(false, `${COLORS.red}token deduction failed${COLORS.reset}`);
      return res.status(500).json({ error: "Failed to deduct tokens" });
    }

    // Log token usage
    await logTokenUsage(
      userId, 
      requiredTokens, 
      reply, 
      '/generate-discord', 
      roomId, 
      { caption, komentar: komentar.length }, 
      { reply }, 
      elapsed,
      req
    );

    spinner.stop(true, `${COLORS.green}ok${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
    logOk(`${COLORS.cyan}${req._id}${COLORS.reset} Discord reply: ${COLORS.gray}"${reply.trim()}"${COLORS.reset} | Tokens: ${user.user_token - requiredTokens}`);
    res.json({ 
      reply,
      tokensUsed: requiredTokens,
      remainingTokens: user.user_token - requiredTokens
    });
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

IMPORTANT LANGUAGE RULES:
- NEVER use contractions ending with 's (like "what's", "how's", "when's", "where's", "who's", "it's", "that's", "here's", "there's", "I'm", "you're", "we're", "they're")
- ALWAYS use full forms: "what is", "how is", "when is", "where is", "who is", "it is", "that is", "here is", "there is", "I am", "you are", "we are", "they are"
- Use natural, conversational English without apostrophes in contractions

Output format:
- ONE line only, the message itself.
- No quotes, no bullets, no numbering, no extra text, no line breaks.

Style examples (do NOT copy literally):
How are you doing?
What is up today?
How is everyone doing?
What is new today?
How is your day going?

Recent messages:
${sampleText || "(no messages)"}

Optional user hint (may be empty):
${sanitizeText(hint)}

Now output exactly ONE short message (2–8 words), no commas, NO contractions with 's.
`.trim();

    const raw = await generateReplyFromGrok(prompt) || "";

    // Normalisasi ke satu kalimat pendek
    let line = raw.replace(/[\r\n]+/g, " ").trim();
    line = line.replace(/^["'""`]+|["'""`]+$/g, "");   // buang kutip pembungkus
    line = line.replace(/[—-]+/g, " ");                 // larang em-dash/hyphen → spasi
    line = line.replace(/\s+/g, " ").trim();
    
    // Remove contractions
    line = removeContractions(line);

    // Validasi: satu pesan saja, tanpa koma, panjang wajar
    const wordCount = line ? line.split(/\s+/).length : 0;
    const invalid = !line || /,/.test(line) || wordCount < 2 || wordCount > 8;

    if (invalid) {
      // fallback sederhana per-room
      const FALLBACK = {
        cys: "How are you doing?",
        mmt: "How are you doing?",
        fgo: "What is good today?",
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

// === Quick Generate (Twitter/X)
app.post("/generate-quick", async (req, res) => {
  const { caption, roomId, userId } = req.body;
  
  if (!caption || !roomId) {
    logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} Missing caption/roomId on /generate-quick`);
    return res.status(400).json({ error: "caption and roomId are required" });
  }

  if (!userId) {
    logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} Missing userId on /generate-quick`);
    return res.status(400).json({ error: "userId is required for authentication" });
  }

  // Check if user exists and has enough tokens
  const user = await getUserById(userId);
  if (!user) {
    logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} User not found: ${userId}`);
    return res.status(404).json({ error: "User not found" });
  }

  // Fixed token cost per request
  const requiredTokens = 4000; // Fixed cost per AI request
  
  const hasEnoughTokens = await checkUserTokens(userId, requiredTokens);
  if (!hasEnoughTokens) {
    logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} Insufficient tokens for user: ${userId} (needs ${requiredTokens}, has ${user.user_token})`);
    return res.status(402).json({ 
      error: "Insufficient tokens", 
      currentTokens: user.user_token,
      requiredTokens: requiredTokens,
      message: `You need ${requiredTokens} tokens for this request. Please top up your account.`
    });
  }

  const spinner = startSpinner(`${req._id} /generate-quick`, "AI thinking");
  try {
    const prompt = `
You are a friendly user in the "${roomId}" community. Write a quick, natural reply to this tweet.

Requirements:
- ONE short sentence only
- Natural and conversational tone
- NO contractions ending with 's (use "what is", "how is", "it is", etc.)
- Keep it simple and genuine

Tweet: "${sanitizeText(caption)}"

Your quick reply (1 sentence, natural, NO contractions with 's):
`.trim();

    const startTime = Date.now();
    const rawReply = await generateReplyFromGrok(prompt);
    const reply = removeContractions(rawReply);
    const elapsed = Date.now() - req._t0;

    if (!reply || reply.trim().length < 5) {
      spinner.stop(false, `${COLORS.red}invalid reply${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
      return res.status(500).json({ error: "Reply not valid" });
    }

    // Deduct tokens from user
    const tokenDeductionSuccess = await deductUserTokens(userId, requiredTokens);
    if (!tokenDeductionSuccess) {
      spinner.stop(false, `${COLORS.red}token deduction failed${COLORS.reset}`);
      return res.status(500).json({ error: "Failed to deduct tokens" });
    }

    // Log token usage
    await logTokenUsage(
      userId, 
      requiredTokens, 
      reply, 
      '/generate-quick', 
      roomId, 
      { caption }, 
      { reply }, 
      elapsed,
      req
    );

    spinner.stop(true, `${COLORS.green}ok${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
    logOk(`${COLORS.cyan}${req._id}${COLORS.reset} Quick reply: ${COLORS.gray}"${reply.trim()}"${COLORS.reset} | Tokens: ${user.user_token - requiredTokens}`);
    res.json({ 
      reply,
      tokensUsed: requiredTokens,
      remainingTokens: user.user_token - requiredTokens
    });
  } catch (err) {
    const elapsed = Date.now() - req._t0;
    spinner.stop(false, `${COLORS.red}error${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
    logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (Quick): ${err?.message || err}`);
    res.status(500).json({ error: "Gagal generate quick reply" });
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

    const rawTranslated = await generateReplyFromGrok(prompt);
    const translated = removeContractions(rawTranslated);
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
