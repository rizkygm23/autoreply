import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { startSpinner, logOk, logErr, logWarn, COLORS } from "../../lib/logger.js";
import { sanitizeText, removeContractions } from "../../lib/helpers.js";
import { generateReplyFromGrok } from "../../services/aiService.js";
import { loadJSON } from "../../lib/storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_JSON_PATH = path.resolve(__dirname, "../../../project.json");

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

// Variations of examples based on second (0-9) to ensure variety
const TEMPLATE_EXAMPLES = {
   how_are_you: {
      0: ["- \"whats good\"", "- \"whats up bro\"", "- \"how u doin\""],
      1: ["- \"everything good?\"", "- \"u busy rn?\"", "- \"what u up to\""],
      2: ["- \"day goin good?\""],
      3: ["- \"good day so far?\"", "- \"u good bro?\""],
      4: ["- \"what ur mood rn?\""],
      5: ["- \"u sleepin good?\""],
      6: ["- \"long time no see\""],
      7: [],
      8: ["- \"whats new bro\""],
      9: ["- \"happy today?\"", "- \"u good?\""]
   },
   how_long: {
      0: ["- \"u been here long?\"", "- \"when d'u join\""],
      1: ["- \"how long u been here?\""],
      2: ["- \"u new here?\""],
      3: ["- \"seen u around before?\""],
      4: ["- \"joined recently?\""],
      5: ["- \"first time chatting here?\""],
      6: ["- \"u know anyone here?\""],
      7: ["- \"here from the start?\""],
      8: ["- \"been active long?\""],
      9: ["- \"plannin to stay long?\""]
   },
   origin: {
      0: ["- \"where u from?\""],
      1: ["- \"where u based?\""],
      2: ["- \"u in the states?\""],
      3: ["- \"what timezone u in?\""],
      4: ["- \"where u livin rn?\""],
      5: ["- \"u near a big city?\""],
      6: ["- \"from around here?\""],
      7: ["- \"u like where u live?\""],
      8: ["- \"weather good there?\""],
      9: ["- \"nice place to live?\""]
   },
   fav_food: {
      0: ["- \"u hungry rn?\""],
      1: ["- \"what u eatin?\""],
      2: ["- \"fav food?\""],
      3: ["- \"u like spicy food?\""],
      4: ["- \"pizza or burger person?\""],
      5: ["- \"u cook much?\""],
      6: ["- \"best food nearby?\""],
      7: ["- \"u snackin on anything?\""],
      8: ["- \"coffee or food first?\""],
      9: ["- \"sweet or salty person?\""]
   },
   weather: {
      0: ["- \"weather good there?\""],
      1: ["- \"is it raining?\""],
      2: ["- \"sunny day?\""],
      3: ["- \"hot or cold rn?\""],
      4: ["- \"nice out today?\""],
      5: ["- \"cold outside?\""],
      6: ["- \"night or day for u?\""],
      7: ["- \"warm enough?\""],
      8: ["- \"forecast lookin good?\""],
      9: ["- \"snowing or nah?\""]
   },
   job: {
      0: ["- \"what u work as?\""],
      1: ["- \"u work or study?\""],
      2: ["- \"busy with work?\""],
      3: ["- \"u like ur job?\""],
      4: ["- \"what line of work?\""],
      5: ["- \"working hard today?\""],
      6: ["- \"office or remote?\""],
      7: ["- \"dream job?\""],
      8: ["- \"student or working?\""],
      9: ["- \"long day at work?\""]
   },
   hobby: {
      0: ["- \"what u do for fun?\""],
      1: ["- \"any hobbies?\""],
      2: ["- \"u play games?\""],
      3: ["- \"like reading?\""],
      4: ["- \"into sports?\""],
      5: ["- \"travel much?\""],
      6: ["- \"working on anything cool?\""],
      7: ["- \"collect anything?\""],
      8: ["- \"creative type?\""],
      9: ["- \"learning anything new?\""]
   },
   music: {
      0: ["- \"what u listenin to?\""],
      1: ["- \"fav music genre?\""],
      2: ["- \"u like rap?\""],
      3: ["- \"into rock music?\""],
      4: ["- \"listening to anything good?\""],
      5: ["- \"u go to concerts?\""],
      6: ["- \"play any instruments?\""],
      7: ["- \"fav artist?\""],
      8: ["- \"spotify or apple music?\""],
      9: ["- \"old school or modern?\""]
   },
   gaming: {
      0: ["- \"u play games?\""],
      1: ["- \"console or pc?\""],
      2: ["- \"what u playin lately?\""],
      3: ["- \"u like shooter games?\""],
      4: ["- \"playin anything good?\""],
      5: ["- \"waitin for new games?\""],
      6: ["- \"retro or new games?\""],
      7: ["- \"mobile gamer?\""],
      8: ["- \"play online much?\""],
      9: ["- \"story games or multiplayer?\""]
   },
   coffee_tea: {
      0: ["- \"coffee or tea?\""],
      1: ["- \"u like coffee?\""],
      2: ["- \"drinkin coffee rn?\""],
      3: ["- \"how u take ur coffee?\""],
      4: ["- \"tea person?\""],
      5: ["- \"need caffeine?\""],
      6: ["- \"morning coffee?\""],
      7: ["- \"iced or hot?\""],
      8: ["- \"espresso fan?\""],
      9: ["- \"black coffee?\""]
   },
   night_owl: {
      0: ["- \"u a night owl?\""],
      1: ["- \"stay up late often?\""],
      2: ["- \"early bird or night owl?\""],
      3: ["- \"u tired rn?\""],
      4: ["- \"sleep schedule good?\""],
      5: ["- \"up late tonight?\""],
      6: ["- \"morning person?\""],
      7: ["- \"cant sleep?\""],
      8: ["- \"always up late?\""],
      9: ["- \"need sleep?\""]
   },
   weekend: {
      0: ["- \"any plans for weekend?\""],
      1: ["- \"weekend goin good?\""],
      2: ["- \"u busy this weekend?\""],
      3: ["- \"relaxing this weekend?\""],
      4: ["- \"doin anything fun?\""],
      5: ["- \"ready for weekend?\""],
      6: ["- \"weekend trip?\""],
      7: ["- \"just chillin this weekend?\""],
      8: ["- \"productive weekend?\""],
      9: ["- \"family time this weekend?\""]
   },
   pet: {
      0: ["- \"u got pets?\""],
      1: ["- \"dog or cat person?\""],
      2: ["- \"u like animals?\""],
      3: ["- \"got a dog?\""],
      4: ["- \"got a cat?\""],
      5: ["- \"any exotic pets?\""],
      6: ["- \"allergies to pets?\""],
      7: ["- \"want any pets?\""],
      8: ["- \"fish or birds?\""],
      9: ["- \"pets name?\""]
   },
   travel: {
      0: ["- \"u like travelin?\""],
      1: ["- \"been anywhere nice?\""],
      2: ["- \"dream vacation spot?\""],
      3: ["- \"plannin any trips?\""],
      4: ["- \"beach or mountains?\""],
      5: ["- \"travel abroad much?\""],
      6: ["- \"road trip fan?\""],
      7: ["- \"solo travel?\""],
      8: ["- \"bucket list trip?\""],
      9: ["- \"fly or drive?\""]
   },
   movie: {
      0: ["- \"seen any good movies?\""],
      1: ["- \"fav movie genre?\""],
      2: ["- \"netflix or cinema?\""],
      3: ["- \"watchin anything good?\""],
      4: ["- \"u like horror?\""],
      5: ["- \"comedy fan?\""],
      6: ["- \"anime movies?\""],
      7: ["- \"action movies?\""],
      8: ["- \"fav actor?\""],
      9: ["- \"series or movies?\""]
   }
};

const REPLY_EXAMPLES = {
   0: [
      "- \"thats sick\"",
      "- \"real, same here\"",
      "- \"ngl that sounds rough\"",
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
      "- \"sheesh wild\"",
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
      "- \"huge W bro\"",
      "- \"big moves only\"",
      "- \"keep grinding man\""
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
         // Load project settings to get room emojis
         let roomEmojis = [];
         try {
            const projectConfig = loadJSON(PROJECT_JSON_PATH);
            const roomConfig = projectConfig?.rooms?.find(r => r.id === roomId);
            if (roomConfig && roomConfig.emojis && roomConfig.emojis.length > 0) {
               roomEmojis = roomConfig.emojis;
            }
         } catch (err) {
            console.warn("Failed to load project.json for emojis", err);
         }

         const hasCustomEmojis = roomEmojis.length > 0;
         const emojiInstructions = hasCustomEmojis
            ? `12. CUSTOM EMOJIS ALLOWED: You MAY use one of these specific emojis at the end: ${roomEmojis.join(", ")}. Do NOT use standard standard unicode emojis.`
            : "12. EXPANDED NO EMOJIS: Absolutely NO emojis of any kind.";

         let prompt;

         if (isQuickChat) {
            // Quick Chat mode - ULTRA SHORT context-aware conversation starter
            const templateDesc = QUICK_CHAT_PROMPTS[quickTemplate] || "conversation starter";
            const contextInfo = caption ? `\nTheir message: "${sanitizeText(caption)}"` : "";

            // Random seed to encourage variety
            const randomSeed = Math.floor(Math.random() * 1000);

            // Time-based variation (0-9)
            const secondDigit = new Date().getSeconds() % 10;
            const topicExamples = TEMPLATE_EXAMPLES[quickTemplate];
            // Fallback to "how_are_you" (general) if template not found, or use generic 0-9 keys if I kept CHAT_EXAMPLES
            // But since I replaced CHAT_EXAMPLES with TEMPLATE_EXAMPLES, I should pick a safe default.
            const examplesList = topicExamples ? topicExamples[secondDigit] : TEMPLATE_EXAMPLES["how_are_you"][secondDigit];
            const examples = examplesList.join("\n");

            prompt = `
You are chatting in "${roomId}" Discord. Generate a VERY SHORT ${templateDesc} to ${username || 'user'}.
${contextInfo}

TYPE: ${quickTemplate}
RANDOM SEED: ${randomSeed} (use this to vary your response - be creative and unique each time!)

CRITICAL RULES:
1. MAXIMUM 4-6 WORDS ONLY. Super short.
2. lowercase only, very casual bro vibes
3. slang style: u, ur, tho, btw, bro, rn, fr
4. AVOID starting with "yo" every time. Use variety.
5. NO standard emojis (like 😂, 🔥) or periods at end.
6. ONE simple question only - just the question, nothing else
7. DO NOT add random stuff like "pushing through" or describe what they're doing
8. DO NOT repeat common phrases - be creative and unique each time
9. STAY ON TOPIC - only ask what TYPE says, nothing extra
10. USE SIMPLE ENGLISH. Avoid complex idioms.
11. BLACKLIST (DO NOT USE): vibing, vibe, holding up, holdin, how u holdin, rollin, grinding, hustle, sheesh, finna, boutta, cap, no cap, bet, cooked
${emojiInstructions}


GOOD EXAMPLES (super casual bro style):
${examples}


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

            // Time-based variation (0-9)
            const secondDigit = new Date().getSeconds() % 10;
            const examples = REPLY_EXAMPLES[secondDigit].join("\n");

            prompt = `
You are chatting in "${roomId}" Discord. Reply to ${username || 'user'}'s message.

Their message: "${sanitizeText(caption)}"

CRITICAL RULES:
1. MAXIMUM 5-8 WORDS ONLY. Super short.
2. lowercase only, casual bro vibes
3. slang: u, ur, tho, btw, rn, ngl, tbh, bro, fr
4. AVOID starting with "yo" every time. Use variety.
5. NO standard emojis (like 😂, 🔥) or periods at end.
6. ONE simple response only
7. ONLY respond to what they said - do NOT add random stuff
8. DO NOT describe activities like "pushing through" or "staying productive"
9. DO NOT make up context that wasn't in their message
10. USE SIMPLE ENGLISH. Avoid complex idioms.
11. BLACKLIST (DO NOT USE): vibing, vibe, holding up, holdin, how u holdin, rollin, grinding, hustle, sheesh, finna, boutta, cap, no cap, bet, cooked
${emojiInstructions}


GOOD EXAMPLES (casual bro style):
${examples}


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
