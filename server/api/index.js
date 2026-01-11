import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

// Load environment variables first
dotenv.config();

// Import after dotenv is configured
import { randId, logInfo, logOk, COLORS } from "../lib/logger.js";
import { openai } from "../services/aiService.js";
import { registerAuthRegisterRoute } from "../routes/auth/register.js";
import { registerAuthLoginRoute } from "../routes/auth/login.js";
import { registerAuthGetUserRoute } from "../routes/auth/getUser.js";
import { registerPaymentCreateRoute } from "../routes/payment/createPayment.js";
import { registerPaymentConfirmRoute } from "../routes/payment/confirmPayment.js";
import { registerTwitterReplyRoute } from "../routes/generate/twitterReply.js";
import { registerTwitterQuoteRoute } from "../routes/generate/twitterQuote.js";
import { registerDiscordReplyRoute } from "../routes/generate/discordReply.js";
import { registerDiscordTopicRoute } from "../routes/generate/discordTopic.js";
import { registerParaphraseRoute } from "../routes/generate/paraphrase.js";
import { registerQuickReplyRoute } from "../routes/generate/quickReply.js";
import { registerTranslateRoute } from "../routes/generate/translate.js";

const app = express();

// CORS configuration
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(bodyParser.json());

// Request logging middleware
app.use((req, _res, next) => {
    req._id = `REQ-${randId()}`;
    req._t0 = Date.now();
    logInfo(`${COLORS.cyan}${req._id}${COLORS.reset} ${COLORS.bold}${req.method}${COLORS.reset} ${req.url}`);
    next();
});

// Health check endpoint
app.get("/", (req, res) => {
    res.json({
        status: "ok",
        message: "Gemini Auto Reply API",
        version: "2.0.0",
        environment: process.env.VERCEL_ENV || "local"
    });
});

// Register all routes
registerAuthRegisterRoute(app);
registerAuthLoginRoute(app);
registerAuthGetUserRoute(app);
registerPaymentCreateRoute(app);
registerPaymentConfirmRoute(app);
registerTwitterReplyRoute(app);
registerTwitterQuoteRoute(app);
registerDiscordReplyRoute(app);
registerDiscordTopicRoute(app);
registerParaphraseRoute(app);
registerQuickReplyRoute(app);
registerTranslateRoute(app);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
        error: "Internal server error",
        message: err.message
    });
});

logOk(`Vercel Serverless Function initialized`);
logInfo(`xAI base URL: ${COLORS.gray}${openai?.baseURL || "https://api.x.ai/v1"}${COLORS.reset}`);

// Export for Vercel Serverless
export default app;
