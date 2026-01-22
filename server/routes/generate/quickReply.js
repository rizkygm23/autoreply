import { startSpinner, logOk, logErr, logWarn, COLORS } from "../../lib/logger.js";
import { sanitizeText, removeContractions } from "../../lib/helpers.js";
import { generateReplyFromGrok } from "../../services/aiService.js";

// Quick Chat Template configurations (Personal Conversation Starters)
const QUICK_CHAT_PROMPTS = {
   how_are_you: "ask how they are doing today",
   how_long: "ask how long they have been in this community",
   origin: "ask where they are from",
   fav_food: "ask about favorite food from their place",
   weather: "ask about weather or time at their place",
   job: "ask what they do for work",
   hobby: "ask about hobbies or favorite activities",
   music: "ask about favorite music genre",
   gaming: "ask what games they play",
   coffee_tea: "ask if they prefer coffee or tea",
   night_owl: "ask if they are night owl or early bird",
   weekend: "ask about weekend plans or activities",
   pet: "ask if they have pets",
   travel: "ask about places they want to visit",
   movie: "ask about favorite movies or series"
};

function registerQuickReplyRoute(app) {
   app.post("/generate-quick", async (req, res) => {
      const { caption, roomId, username, quickTemplate, quickMessage } = req.body;

      // If quickTemplate is provided, we have a predefined template to enhance
      const isQuickChat = !!quickTemplate && !!quickMessage;

      if (!roomId) {
         logWarn(`${COLORS.cyan}${req._id}${COLORS.reset} Missing roomId on /generate-quick`);
         return res.status(400).json({ error: "roomId is required" });
      }

      const spinner = startSpinner(`${req._id} /generate-quick${isQuickChat ? ` (${quickTemplate})` : ""}`, "AI thinking");

      try {
         let prompt;

         if (isQuickChat) {
            // Quick Chat mode - ULTRA SHORT context-aware conversation starter
            const templateDesc = QUICK_CHAT_PROMPTS[quickTemplate] || "conversation starter";
            const contextInfo = caption ? `\nTheir message: "${sanitizeText(caption)}"` : "";

            prompt = `
You are chatting in "${roomId}" Discord. Generate a VERY SHORT ${templateDesc} to ${username || 'user'}.
${contextInfo}

TYPE: ${quickTemplate}

CRITICAL RULES:
1. MAXIMUM 5-8 WORDS ONLY. No more.
2. lowercase only
3. casual slang: u, ur, tho, btw
4. NO emojis, NO period at end
5. ONE simple question or greeting only
6. Reference context briefly if relevant

GOOD EXAMPLES (copy this style, don't copy the sentence):
- "where u from btw"
- "what timezone u in"
- "how did u get into crypto"
- "gm how is ur day"
- "welcome to the fam"
- "any alpha to share"
- "what chain u prefer"
- "how long u been here"

BAD (too long, don't do this):
- "ishikawa is cool, ur mum from there so what timezone u in, i am usually active evenings gmt"

OUTPUT: Only the short message, nothing else.
`.trim();
         } else {
            // Regular quick reply mode
            if (!caption) {
               spinner.stop(false, `${COLORS.red}missing caption${COLORS.reset}`);
               return res.status(400).json({ error: "caption is required for regular quick reply" });
            }

            prompt = `
You are chatting in "${roomId}" Discord. Reply to ${username || 'user'}'s message.

Their message: "${sanitizeText(caption)}"

CRITICAL RULES:
1. MAXIMUM 5-10 WORDS ONLY. Keep it super short.
2. lowercase only, no caps
3. casual slang: u, ur, tho, btw, rn, ngl, tbh
4. NO emojis, NO period at end
5. ONE simple response only
6. Sound like a real person chatting, not a bot
7. Match their energy - if casual, be casual

GOOD EXAMPLES (copy this style, don't copy the sentence):
- "nice, what made u try that"
- "same here tbh"
- "that sounds rough ngl"
- "u been doing this long"
- "what chain u on rn"
- "solid take, makes sense"
- "how u find out about it"
- "real, been there too"

BAD (too long/formal, avoid):
- "that's a really interesting perspective, i think the community would benefit from this approach"
- "I completely agree with what you're saying here"

OUTPUT: Only the short reply, nothing else.
`.trim();
         }

         const aiResponse = await generateReplyFromGrok(prompt);
         const reply = removeContractions(aiResponse.content);
         const elapsed = Date.now() - req._t0;

         if (!reply || reply.trim().length < 5) {
            spinner.stop(false, `${COLORS.red}invalid reply${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
            return res.status(500).json({ error: "Reply not valid" });
         }

         spinner.stop(true, `${COLORS.green}ok${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
         logOk(`${COLORS.cyan}${req._id}${COLORS.reset} Quick reply${isQuickChat ? ` (${quickTemplate})` : ""}: ${COLORS.gray}"${reply.trim()}"${COLORS.reset}`);
         res.json({ reply });
      } catch (err) {
         const elapsed = Date.now() - req._t0;
         spinner.stop(false, `${COLORS.red}error${COLORS.reset} ${COLORS.dim}(${elapsed} ms)${COLORS.reset}`);
         logErr(`${COLORS.cyan}${req._id}${COLORS.reset} Error (Quick): ${err?.message || err}`);
         res.status(500).json({ error: "Gagal generate quick reply" });
      }
   });
}

export { registerQuickReplyRoute };
