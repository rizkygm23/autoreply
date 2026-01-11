import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

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

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

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
        version: "2.0.0"
    });
});

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

logOk(`Vercel Serverless Function initialized`);
logInfo(`xAI base URL: ${COLORS.gray}${openai.baseURL || "https://api.x.ai/v1"}${COLORS.reset}`);

// Export for Vercel Serverless
export default app;
