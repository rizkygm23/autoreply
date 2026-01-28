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
      1: ["- \"everything good?\"", "- \"sup u busy?\"", "- \"what u up to\""],
      2: ["- \"relaxing or working?\"", "- \"hows life\"", "- \"day goin good?\""],
      3: ["- \"good day so far?\"", "- \"mood check\"", "- \"u good bro?\""],
      4: ["- \"mood rn?\"", "- \"u energetic?\"", "- \"tired or nah?\""],
      5: ["- \"u sleepin good?\"", "- \"energy check\"", "- \"sup random check\""],
      6: ["- \"you alive?\"", "- \"long time no see\"", "- \"everything solid?\""],
      7: ["- \"hows the mental\"", "- \"stress levels?\"", "- \"relaxing?\""],
      8: ["- \"whats new bro\"", "- \"anything exciting\"", "- \"same old?\""],
      9: ["- \"happy today?\"", "- \"u good?\"", "- \"mood check\""]
   },
   how_long: {
      0: ["- \"u been here long?\"", "- \"when d'u join\"", "- \"u new here?\""],
      1: ["- \"old or new?\"", "- \"how long u been here\"", "- \"u join recently?\""],
      2: ["- \"whats ur join date\"", "- \"been active long?\"", "- \"seen u before?\""],
      3: ["- \"u know ppl here?\"", "- \"new or old member\"", "- \"time flies huh\""],
      4: ["- \"here since start?\"", "- \"joined when?\"", "- \"new or classic?\""],
      5: ["- \"first time here?\"", "- \"long time member?\"", "- \"sup new guy\""],
      6: ["- \"been here mostly?\"", "- \"read or chat?\"", "- \"history check\""],
      7: ["- \"remember old days?\"", "- \"verified long?\"", "- \"member since 202?\""],
      8: ["- \"how many months\"", "- \"years or months?\"", "- \"quick stat check\""],
      9: ["- \"forever member?\"", "- \"stayin long?\"", "- \"plan to stay?\""]
   },
   origin: {
      0: ["- \"where u from\"", "- \"u local?\"", "- \"where u based\""],
      1: ["- \"what timezone\"", "- \"from states?\"", "- \"country check\""],
      2: ["- \"u asian or nah?\"", "- \"where u livin rn\"", "- \"sup u western?\""],
      3: ["- \"hometown feels?\"", "- \"movin or stayin?\"", "- \"born there?\""],
      4: ["- \"city or village?\"", "- \"busy city life?\"", "- \"quiet place?\""],
      5: ["- \"u near sea?\"", "- \"inland or coast?\"", "- \"where exactly\""],
      6: ["- \"north or south?\"", "- \"east or west side?\"", "- \"reppin where?\""],
      7: ["- \"u speak lang?\"", "- \"native there?\"", "- \"accent check\""],
      8: ["- \"hot or cold there\"", "- \"weather good?\"", "- \"place nice?\""],
      9: ["- \"dream place?\"", "- \"u like it there?\"", "- \"movin soon?\""]
   },
   fav_food: {
      0: ["- \"hungry rn\"", "- \"fav food go\"", "- \"u eat yet?\""],
      1: ["- \"pizza or burger\"", "- \"sweet or salty?\"", "- \"best dish there?\""],
      2: ["- \"u cook?\"", "- \"chef or takeout?\"", "- \"fav cuisine\""],
      3: ["- \"spicy food fan?\"", "- \"sushi guy?\"", "- \"meat or veg?\""],
      4: ["- \"dessert guy?\"", "- \"snack addict?\"", "- \"night snack?\""],
      5: ["- \"breakfast person?\"", "- \"coffee or food first\"", "- \"fav restaurant?\""],
      6: ["- \"homecooked best?\"", "- \"moms cooking?\"", "- \"fancy dining?\""],
      7: ["- \"exotic food?\"", "- \"try new food?\"", "- \"food adventurous?\""],
      8: ["- \"fruit or junk\"", "- \"healthy eater?\"", "- \"gym diet?\""],
      9: ["- \"comfort food\"", "- \"sad meal?\"", "- \"happy meal?\""]
   },
   weather: {
      0: ["- \"sunny there?\"", "- \"raining rn?\"", "- \"weather check\""],
      1: ["- \"hot or cold\"", "- \"freezing rn?\"", "- \"really hot?\""],
      2: ["- \"snowing maybe?\"", "- \"stormy skies?\"", "- \"windy af?\""],
      3: ["- \"night or day\"", "- \"sun up yet?\"", "- \"dark outside?\""],
      4: ["- \"perfect weather?\"", "- \"picnic weather?\"", "- \"stay inside weather\""],
      5: ["- \"humidity check\"", "- \"dry or humid\"", "- \"aircon season?\""],
      6: ["- \"fog city?\"", "- \"clear skies?\"", "- \"star gazing?\""],
      7: ["- \"winter coat?\"", "- \"shorts weather?\"", "- \"hoodie season?\""],
      8: ["- \"climate change?\"", "- \"weird weather?\"", "- \"normal day?\""],
      9: ["- \"forecast good?\"", "- \"expect rain?\"", "- \"to rain or no?\""]
   },
   job: {
      0: ["- \"what u workin on\"", "- \"u work or study?\"", "- \"job title bro\""],
      1: ["- \"tech guy?\"", "- \"creative field?\"", "- \"manual labor?\""],
      2: ["- \"u student still?\"", "- \"uni or hs?\"", "- \"graduated yet?\""],
      3: ["- \"remote work?\"", "- \"office worker?\"", "- \"freelancer?\""],
      4: ["- \"dream job?\"", "- \"hate ur job?\"", "- \"love work?\""],
      5: ["- \"working hard?\"", "- \"busy rn?\"", "- \"chillin at work\""],
      6: ["- \"boss man?\"", "- \"employee life?\"", "- \"startup guy?\""],
      7: ["- \"tech stack?\"", "- \"coding wizard?\"", "- \"sales guy?\""],
      8: ["- \"artist?\"", "- \"musician?\"", "- \"engineer?\""],
      9: ["- \"retired?\"", "- \"easy life?\"", "- \"hard worker?\""]
   },
   hobby: {
      0: ["- \"free time stuff\"", "- \"hobbies bro?\"", "- \"what u do 4 fun\""],
      1: ["- \"creative type?\"", "- \"draw or paint?\"", "- \"write stuff?\""],
      2: ["- \"sport guy?\"", "- \"gym rat?\"", "- \"lazy day?\""],
      3: ["- \"collector?\"", "- \"collect what?\"", "- \"collection check\""],
      4: ["- \"reading?\"", "- \"book worm?\"", "- \"kindle guy?\""],
      5: ["- \"travel bug?\"", "- \"hiking?\"", "- \"nature guy?\""],
      6: ["- \"coding 4 fun\"", "- \"side projects?\"", "- \"hacker man?\""],
      7: ["- \"car guy?\"", "- \"motorhead?\"", "- \"fast cars?\""],
      8: ["- \"diy guy?\"", "- \"fix stuff?\"", "- \"builder?\""],
      9: ["- \"learnin smth?\"", "- \"new skill?\"", "- \"curious type\""]
   },
   music: {
      0: ["- \"what u listening to\"", "- \"music taste check\"", "- \"spotify wrapped?\""],
      1: ["- \"rap or pop\"", "- \"rock fan?\"", "- \"edm head?\""],
      2: ["- \"old school?\"", "- \"modern hits?\"", "- \"throwbacks?\""],
      3: ["- \"sad songs?\"", "- \"hype tracks?\"", "- \"chill lofi?\""],
      4: ["- \"fav artist\"", "- \"concert goer?\"", "- \"live music?\""],
      5: ["- \"play instrument\"", "- \"guitar hero?\"", "- \"piano man?\""],
      6: ["- \"producer?\"", "- \"make beats?\"", "- \"dj guy?\""],
      7: ["- \"kpop?\"", "- \"anime song?\"", "- \"movie scores?\""],
      8: ["- \"vinyl guy?\"", "- \"audiophile?\"", "- \"headphones on?\""],
      9: ["- \"sing?\"", "- \"karaoke god?\"", "- \"shower singer\""]
   },
   gaming: {
      0: ["- \"what u playin\"", "- \"gamer check\"", "- \"console or pc\""],
      1: ["- \"fps god?\"", "- \"rpg fan?\"", "- \"mmo addict?\""],
      2: ["- \"league player?\"", "- \"valorant?\"", "- \"csgo?\""],
      3: ["- \"casual mobile?\"", "- \"serious gamer?\"", "- \"chill games\""],
      4: ["- \"singleplayer?\"", "- \"story mode?\"", "- \"online only\""],
      5: ["- \"retro games?\"", "- \"emulator?\"", "- \"nostalgia?\""],
      6: ["- \"indie gems?\"", "- \"triple a only?\"", "- \"hidden finds\""],
      7: ["- \"esports fan?\"", "- \"watch twitch?\"", "- \"streamer?\""],
      8: ["- \"rage quit?\"", "- \"never angry?\"", "- \"toxic lol\""],
      9: ["- \"waiting 4 gta6\"", "- \"hype train?\"", "- \"new releases\""]
   },
   coffee_tea: {
      0: ["- \"coffee person?\"", "- \"tea drinker?\"", "- \"caffeine addict\""],
      1: ["- \"espresso?\"", "- \"latte art?\"", "- \"black coffee\""],
      2: ["- \"matcha?\"", "- \"bubble tea?\"", "- \"herbal tea\""],
      3: ["- \"sugar rush?\"", "- \"sweet or bitter\"", "- \"milk or no\""],
      4: ["- \"morning brew\"", "- \"afternoon tea\"", "- \"night cap\""],
      5: ["- \"starbucks?\"", "- \"local cafe?\"", "- \"homemade?\""],
      6: ["- \"energy drink?\"", "- \"redbull?\"", "- \"monster?\""],
      7: ["- \"hot or iced\"", "- \"cold brew?\"", "- \"frappe?\""],
      8: ["- \"caffeine free\"", "- \"decaf guy?\"", "- \"water gang\""],
      9: ["- \"mug collection\"", "- \"fancy cup?\"", "- \"travel mug\""]
   },
   night_owl: {
      0: ["- \"sleep schedule\"", "- \"tired rn?\"", "- \"wide awake\""],
      1: ["- \"night owl?\"", "- \"stay up late?\"", "- \"no sleep\""],
      2: ["- \"early bird?\"", "- \"morning person\"", "- \"sunrise gang\""],
      3: ["- \"napper?\"", "- \"nap time?\"", "- \"power nap\""],
      4: ["- \"3am thoughts\"", "- \"midnight snack\"", "- \"quiet hours\""],
      5: ["- \"work at nite\"", "- \"night shift?\"", "- \"day shift\""],
      6: ["- \"party all nite\"", "- \"clubbing?\"", "- \"stayin in\""],
      7: ["- \"insomnia?\"", "- \"cant sleep?\"", "- \"counting sheep\""],
      8: ["- \"alarm clock\"", "- \"snooze button\"", "- \"wake up fast\""],
      9: ["- \"dark circles\"", "- \"zombie mode\"", "- \"fresh face\""]
   },
   weekend: {
      0: ["- \"weekend plans\"", "- \"ready 4 weekend\"", "- \"friday feels\""],
      1: ["- \"party time?\"", "- \"relax mode?\"", "- \"sleep in\""],
      2: ["- \"adventures?\"", "- \"trip planned?\"", "- \"staycaction\""],
      3: ["- \"chores day?\"", "- \"cleaning up?\"", "- \"laundry day\""],
      4: ["- \"family time?\"", "- \"friends hangout\"", "- \"solo chillin\""],
      5: ["- \"sunday scaries\"", "- \"monday blues\"", "- \"weekend over\""],
      6: ["- \"binge watch?\"", "- \"movie marathon\"", "- \"series catchup\""],
      7: ["- \"shopping?\"", "- \"money spending\"", "- \"saving mode\""],
      8: ["- \"hobbies time\"", "- \"project work\"", "- \"learning time\""],
      9: ["- \"drinking?\"", "- \"sober weekend\"", "- \"healthy weekend\""]
   },
   pet: {
      0: ["- \"got pets?\"", "- \"animal lover?\"", "- \"dog or cat\""],
      1: ["- \"dog person?\"", "- \"puppy luv\"", "- \"big dogs\""],
      2: ["- \"cat person?\"", "- \"kitten lover\"", "- \"crazy cat guy\""],
      3: ["- \"exotic pets?\"", "- \"snake?\"", "- \"lizard?\""],
      4: ["- \"bird watcher\"", "- \"parrot?\"", "- \"noise maker\""],
      5: ["- \"fish tank?\"", "- \"aquarium?\"", "- \"nemo?\""],
      6: ["- \"allergies?\"", "- \"no pets?\"", "- \"sad life\""],
      7: ["- \"rescue pet?\"", "- \"adopted?\"", "- \"store bought\""],
      8: ["- \"pet name?\"", "- \"cute names\"", "- \"funny name\""],
      9: ["- \"fluffy?\"", "- \"hairless?\"", "- \"shedding bad\""]
   },
   travel: {
      0: ["- \"travel plans\"", "- \"next trip?\"", "- \"vacation mode\""],
      1: ["- \"been abroad?\"", "- \"passport stamp\"", "- \"local trips\""],
      2: ["- \"beach trip?\"", "- \"mountain hike\"", "- \"city break\""],
      3: ["- \"plane ride?\"", "- \"road trip?\"", "- \"train guy\""],
      4: ["- \"solo travel\"", "- \"group tour\"", "- \"family trip\""],
      5: ["- \"backpacker?\"", "- \"luxury hotel\"", "- \"hostel life\""],
      6: ["- \"bucket list\"", "- \"dream spot\"", "- \"must visit\""],
      7: ["- \"language issue\"", "- \"lost translation\"", "- \"google translate\""],
      8: ["- \"food tourism\"", "- \"eat pray love\"", "- \"tasting menu\""],
      9: ["- \"homesick?\"", "- \"miss home?\"", "- \"never return\""]
   },
   movie: {
      0: ["- \"seen any movies\"", "- \"cinema trip?\"", "- \"netflix rn\""],
      1: ["- \"horror fan?\"", "- \"scary movie\"", "- \"jumpscare\""],
      2: ["- \"comedy?\"", "- \"funny stuff\"", "- \"laughing rn\""],
      3: ["- \"action packed\"", "- \"explosions?\"", "- \"fast furious\""],
      4: ["- \"romance?\"", "- \"love story\"", "- \"cheesy movie\""],
      5: ["- \"sci fi?\"", "- \"aliens?\"", "- \"space travel\""],
      6: ["- \"documentary\"", "- \"learn stuff\"", "- \"real life\""],
      7: ["- \"anime movie\"", "- \"ghibli?\"", "- \"shinkai?\""],
      8: ["- \"fav actor\"", "- \"celebrity crush\"", "- \"hollywood\""],
      9: ["- \"popcorn?\"", "- \"snacks ready\"", "- \"movie night\""]
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
3. slang style: u, ur, tho, btw, sup, bro, rn, fr
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
