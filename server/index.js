import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import { randId, logInfo, logOk, COLORS } from "./lib/logger.js";
import { openai, checkAIConnection } from "./services/aiService.js";
import { registerTwitterReplyRoute } from "./routes/generate/twitterReply.js";
import { registerTwitterQuoteRoute } from "./routes/generate/twitterQuote.js";
import { registerDiscordReplyRoute } from "./routes/generate/discordReply.js";
import { registerDiscordTopicRoute } from "./routes/generate/discordTopic.js";
import { registerParaphraseRoute } from "./routes/generate/paraphrase.js";
import { registerQuickReplyRoute } from "./routes/generate/quickReply.js";
import { registerTranslateRoute } from "./routes/generate/translate.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Request logging middleware
app.use((req, _res, next) => {
  req._id = `REQ-${randId()}`;
  req._t0 = Date.now();
  logInfo(`${COLORS.cyan}${req._id}${COLORS.reset} ${COLORS.bold}${req.method}${COLORS.reset} ${req.url}`);
  next();
});

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Gemini Auto Reply API",
    version: "2.1.0"
  });
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Register routes
registerTwitterReplyRoute(app);
registerTwitterQuoteRoute(app);
registerDiscordReplyRoute(app);
registerDiscordTopicRoute(app);
registerParaphraseRoute(app);
registerQuickReplyRoute(app);
registerTranslateRoute(app);

// Start server and check AI connection
async function startServer() {
  logOk(`Server booting on ${COLORS.bold}http://localhost:${PORT}${COLORS.reset}`);
  logInfo(`xAI base URL: ${COLORS.gray}${openai.baseURL || "https://api.x.ai/v1"}${COLORS.reset}`);

  app.listen(PORT, async () => {
    logOk(`Server aktif di ${COLORS.bold}http://localhost:${PORT}${COLORS.reset}`);
    console.log(""); // Empty line for readability

    // Check AI connection on startup
    const isConnected = await checkAIConnection();
    console.log(""); // Empty line for readability

    if (isConnected) {
      logOk("🚀 Server ready to receive requests!");
    } else {
      console.log("\x1b[33m⚠️  Server running but AI connection failed. Check your API key.\x1b[0m");
    }
  });
}

startServer();
