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

            // Random seed to encourage variety
            const randomSeed = Math.floor(Math.random() * 1000);

            prompt = `
You are chatting in "${roomId}" Discord. Generate a VERY SHORT ${templateDesc} to ${username || 'user'}.
${contextInfo}

TYPE: ${quickTemplate}
RANDOM SEED: ${randomSeed} (use this to vary your response - be creative and unique each time!)

CRITICAL RULES:
1. MAXIMUM 4-6 WORDS ONLY. Super short.
2. lowercase only, very casual bro vibes
3. slang style: u, ur, tho, btw, yo, sup, broo, bro, aight
4. NO emojis, NO period at end
5. ONE simple question only - just the question, nothing else
6. DO NOT add random stuff like "pushing through" or describe what they're doing
7. DO NOT repeat common phrases - be creative and unique each time
8. STAY ON TOPIC - only ask what TYPE says, nothing extra

GOOD EXAMPLES (super casual bro style):
- "yo whats good"
- "wssup broo"
- "how u doin man"
- "aight where u from"
- "yo u been here long"
- "sup what timezone u in"
- "yo what u workin on"
- "chillin or busy rn"

BAD (too formal/robotic - NEVER do this):
- "gm how u doing today" (too formal)
- "gm how is ur day" (too stiff)  
- "hello how are you doing" (way too formal)
- "pushing through the afternoon" (random made up stuff)

BAD (adding random stuff - NEVER do this):
- "gmic iwa, pushing through the afternoon" (don't add random activities)
- "yo bro staying productive today" (don't assume what they're doing)

OUTPUT: Only the short casual question, nothing else. Be unique - don't use the same phrase twice.
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
1. MAXIMUM 5-8 WORDS ONLY. Super short.
2. lowercase only, casual bro vibes
3. slang: u, ur, tho, btw, rn, ngl, tbh, yo, broo
4. NO emojis, NO period at end
5. ONE simple response only
6. ONLY respond to what they said - do NOT add random stuff
7. DO NOT describe activities like "pushing through" or "staying productive"
8. DO NOT make up context that wasn't in their message

GOOD EXAMPLES (casual bro style):
- "yo thats sick"
- "real, same here bro"
- "ngl that sounds rough"
- "aight makes sense"
- "wait fr?"
- "yo nice one"
- "lmao true tho"

BAD (adding random stuff - NEVER do this):
- "nice bro, pushing through the afternoon" (don't add random activities)
- "solid, staying productive today" (don't make up what they're doing)
- "that's definitely an interesting point" (too formal)

OUTPUT: Only the short casual reply, nothing else.
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
