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

// Variations of examples based on second (0-9) to ensure variety
const TEMPLATE_EXAMPLES = {
   how_are_you: {
      0: ["- \"yo whats good\"", "- \"wssup broo\"", "- \"how u doin man\""],
      1: ["- \"yo everything good?\"", "- \"sup u busy?\"", "- \"yo what u up to\""],
      2: ["- \"chillin or workin?\"", "- \"yo hows life\"", "- \"yo day goin aight?\""],
      3: ["- \"sup good day so far?\"", "- \"yo mood check\"", "- \"u good bro?\""],
      4: ["- \"mood rn?\"", "- \"yo u been energetic?\"", "- \"feelin tired or nah?\""],
      5: ["- \"u sleepin good?\"", "- \"yo energy check\"", "- \"sup random check\""],
      6: ["- \"yo you alive?\"", "- \"sup ghost\"", "- \"everything solid?\""],
      7: ["- \"yo hows the mental\"", "- \"stress levels?\"", "- \"chillin?\""],
      8: ["- \"whats new bro\"", "- \"sup anything exciting\"", "- \"same old same old?\""],
      9: ["- \"yo happy today?\"", "- \"u straight?\"", "- \"mood check\""]
   },
   how_long: {
      0: ["- \"yo u been here long\"", "- \"when d'u join\"", "- \"u new here?\""],
      1: ["- \"yo og or new?\"", "- \"how long u chillin here\"", "- \"u join recently?\""],
      2: ["- \"whats ur join date\"", "- \"u been active long?\"", "- \"seen u before?\""],
      3: ["- \"u know ppl here?\"", "- \"yo veteran or rookie\"", "- \"time flies huh\""],
      4: ["- \"u here since start?\"", "- \"yo joined when?\"", "- \"fresh or vintage?\""],
      5: ["- \"yo first time here?\"", "- \"long time member?\"", "- \"sup new guy?\""],
      6: ["- \"damn u been here mostly?\"", "- \"mostly lurk or chat?\"", "- \"history check\""],
      7: ["- \"u remember old days?\"", "- \"yo u verified long?\"", "- \"member since 202?\""],
      8: ["- \"how many months bro\"", "- \"years or months?\"", "- \"yo quick stat check\""],
      9: ["- \"yo forever member?\"", "- \"u stayin long?\"", "- \"plan to stay?\""]
   },
   origin: {
      0: ["- \"aight where u from\"", "- \"yo u local?\"", "- \"where u based bro\""],
      1: ["- \"what timezone u in\"", "- \"u from states?\"", "- \"yo country check\""],
      2: ["- \"u asian or nah?\"", "- \"where u livin rn\"", "- \"sup u western?\""],
      3: ["- \"yo hometown feels?\"", "- \"u movin or stayin?\"", "- \"born there?\""],
      4: ["- \"yo city or village?\"", "- \"busy city life?\"", "- \"quiet place?\""],
      5: ["- \"yo u near sea?\"", "- \"inland or coast?\"", "- \"where exactly bro\""],
      6: ["- \"north or south?\"", "- \"east or west side?\"", "- \"reppin where?\""],
      7: ["- \"yo u speak lang?\"", "- \"native there?\"", "- \"accent check\""],
      8: ["- \"yo hot or cold there\"", "- \"weather dependent?\"", "- \"place nice?\""],
      9: ["- \"yo dream place?\"", "- \"u like it there?\"", "- \"movin soon?\""]
   },
   fav_food: {
      0: ["- \"yo starving rn\"", "- \"fav food go\"", "- \"u eat yet?\""],
      1: ["- \"yo pizza or burger\"", "- \"sweet or salty?\"", "- \"best dish there?\""],
      2: ["- \"yo u cook?\"", "- \"chef or takeout?\"", "- \"fav cuisine bro\""],
      3: ["- \"spicy food fan?\"", "- \"yo sushi guy?\"", "- \"meat or veg?\""],
      4: ["- \"yo dessert guy?\"", "- \"snack addict?\"", "- \"late night munchies\""],
      5: ["- \"yo breakfast person?\"", "- \"coffee or food first\"", "- \"fav restaurant?\""],
      6: ["- \"yo homecooked best?\"", "- \"moms cooking?\"", "- \"fancy dining?\""],
      7: ["- \"yo exotic food?\"", "- \"try anything weird?\"", "- \"food adventurous?\""],
      8: ["- \"yo fruit or junk\"", "- \"healthy eater?\"", "- \"gym diet?\""],
      9: ["- \"yo comfort food\"", "- \"sad meal?\"", "- \"happy meal?\""]
   },
   weather: {
      0: ["- \"yo sunny there?\"", "- \"raining rn?\"", "- \"weather check\""],
      1: ["- \"yo hot or cold\"", "- \"freezing rn?\"", "- \"sweating bullets?\""],
      2: ["- \"snowing maybe?\"", "- \"stormy skies?\"", "- \"windy af?\""],
      3: ["- \"yo night or day\"", "- \"sun up yet?\"", "- \"pitch black?\""],
      4: ["- \"perfect weather?\"", "- \"picnic weather?\"", "- \"stay inside weather\""],
      5: ["- \"yo humidity check\"", "- \"dry or humid\"", "- \"aircon season?\""],
      6: ["- \"yo fog city?\"", "- \"clear skies?\"", "- \"star gazing?\""],
      7: ["- \"yo winter coat?\"", "- \"shorts weather?\"", "- \"hoodie season?\""],
      8: ["- \"yo climate change?\"", "- \"weird weather?\"", "- \"normal day?\""],
      9: ["- \"yo forecast good?\"", "- \"expect rain?\"", "- \"umbrella need?\""]
   },
   job: {
      0: ["- \"yo what u workin on\"", "- \"u work or study?\"", "- \"job title bro\""],
      1: ["- \"yo tech guy?\"", "- \"creative field?\"", "- \"manual labor?\""],
      2: ["- \"u student still?\"", "- \"uni or hs?\"", "- \"graduated yet?\""],
      3: ["- \"yo remote work?\"", "- \"office slave?\"", "- \"freelancer?\""],
      4: ["- \"yo dream job?\"", "- \"hate ur job?\"", "- \"love work?\""],
      5: ["- \"yo hustle mode?\"", "- \"grinding rn?\"", "- \"chillin at work\""],
      6: ["- \"yo boss man?\"", "- \"employee life?\"", "- \"startup guy?\""],
      7: ["- \"yo tech stack?\"", "- \"coding wizard?\"", "- \"sales guy?\""],
      8: ["- \"yo artist?\"", "- \"musician?\"", "- \"engineer?\""],
      9: ["- \"yo retired?\"", "- \"easy life?\"", "- \"hard worker?\""]
   },
   hobby: {
      0: ["- \"yo free time stuff\"", "- \"hobbies bro?\"", "- \"what u do 4 fun\""],
      1: ["- \"yo creative type?\"", "- \"draw or paint?\"", "- \"write stuff?\""],
      2: ["- \"yo sport guy?\"", "- \"gym rat?\"", "- \"couch potato?\""],
      3: ["- \"yo collector?\"", "- \"collect what?\"", "- \"hoarder lol\""],
      4: ["- \"yo reading?\"", "- \"book worm?\"", "- \"kindle guy?\""],
      5: ["- \"yo travel bug?\"", "- \"hiking?\"", "- \"nature guy?\""],
      6: ["- \"yo coding 4 fun\"", "- \"side projects?\"", "- \"hacker man?\""],
      7: ["- \"yo car guy?\"", "- \"motorhead?\"", "- \"speed demon\""],
      8: ["- \"yo diy guy?\"", "- \"fix stuff?\"", "- \"builder?\""],
      9: ["- \"yo learnin smth?\"", "- \"new skill?\"", "- \"curious mind\""]
   },
   music: {
      0: ["- \"yo what u bumpin\"", "- \"music taste check\"", "- \"spotify wrapped?\""],
      1: ["- \"yo rap or pop\"", "- \"rock fan?\"", "- \"edm head?\""],
      2: ["- \"yo old school?\"", "- \"modern hits?\"", "- \"throwbacks?\""],
      3: ["- \"yo sad songs?\"", "- \"hype tracks?\"", "- \"chill lofi?\""],
      4: ["- \"yo fav artist\"", "- \"concert goer?\"", "- \"live music?\""],
      5: ["- \"yo play instrument\"", "- \"guitar hero?\"", "- \"piano man?\""],
      6: ["- \"yo producer?\"", "- \"make beats?\"", "- \"dj guy?\""],
      7: ["- \"yo kpop?\"", "- \"anime ost?\"", "- \"movie scores?\""],
      8: ["- \"yo vinyl guy?\"", "- \"audiophile?\"", "- \"headphones on?\""],
      9: ["- \"yo sing?\"", "- \"karaoke god?\"", "- \"shower singer\""]
   },
   gaming: {
      0: ["- \"yo what u playin\"", "- \"gamer check\"", "- \"console or pc\""],
      1: ["- \"yo fps god?\"", "- \"rpg grinder?\"", "- \"mmo addict?\""],
      2: ["- \"yo league player?\"", "- \"valorant?\"", "- \"csgo?\""],
      3: ["- \"yo casual mobile?\"", "- \"sweaty gamer?\"", "- \"chill games\""],
      4: ["- \"yo singleplayer?\"", "- \"story mode?\"", "- \"online only\""],
      5: ["- \"yo retro games?\"", "- \"emulator?\"", "- \"nostalgia?\""],
      6: ["- \"yo indie gems?\"", "- \"triple a only?\"", "- \"hidden finds\""],
      7: ["- \"yo esports fan?\"", "- \"watch twitch?\"", "- \"streamer?\""],
      8: ["- \"yo rage quit?\"", "- \"tilt proof?\"", "- \"toxic lol\""],
      9: ["- \"yo waiting 4 gta6\"", "- \"hype train?\"", "- \"new releases\""]
   },
   coffee_tea: {
      0: ["- \"yo coffee person?\"", "- \"tea drinker?\"", "- \"caffeine addict\""],
      1: ["- \"yo espresso?\"", "- \"latte art?\"", "- \"black coffee\""],
      2: ["- \"yo matcha?\"", "- \"bubble tea?\"", "- \"herbal tea\""],
      3: ["- \"yo sugar rush?\"", "- \"sweet or bitter\"", "- \"milk or no\""],
      4: ["- \"yo morning brew\"", "- \"afternoon tea\"", "- \"night cap\""],
      5: ["- \"yo starbucks?\"", "- \"local cafe?\"", "- \"homemade?\""],
      6: ["- \"yo energy drink?\"", "- \"redbull?\"", "- \"monster?\""],
      7: ["- \"yo hot or iced\"", "- \"cold brew?\"", "- \"frappe?\""],
      8: ["- \"yo caffeine free\"", "- \"decaf guy?\"", "- \"water gang\""],
      9: ["- \"yo mug collection\"", "- \"fancy cup?\"", "- \"travel mug\""]
   },
   night_owl: {
      0: ["- \"yo sleep schedule\"", "- \"tired rn?\"", "- \"wide awake\""],
      1: ["- \"yo night owl?\"", "- \"vampire mode?\"", "- \"no sleep\""],
      2: ["- \"yo early bird?\"", "- \"morning person\"", "- \"sunrise gang\""],
      3: ["- \"yo napper?\"", "- \"siesta time?\"", "- \"power nap\""],
      4: ["- \"yo 3am thoughts\"", "- \"midnite snack\"", "- \"quiet hours\""],
      5: ["- \"yo work at nite\"", "- \"night shift?\"", "- \"day shift\""],
      6: ["- \"yo party all nite\"", "- \"clubbing?\"", "- \"stayin in\""],
      7: ["- \"yo insomnia?\"", "- \"cant sleep?\"", "- \"counting sheep\""],
      8: ["- \"yo alarm clock\"", "- \"snooze button\"", "- \"wake up fast\""],
      9: ["- \"yo dark circles\"", "- \"zombie mode\"", "- \"fresh face\""]
   },
   weekend: {
      0: ["- \"yo weekend plans\"", "- \"ready 4 weekend\"", "- \"friday feels\""],
      1: ["- \"yo party time?\"", "- \"relax mode?\"", "- \"sleep in\""],
      2: ["- \"yo adventures?\"", "- \"trip planned?\"", "- \"staycaction\""],
      3: ["- \"yo chores day?\"", "- \"cleaning up?\"", "- \"laundry day\""],
      4: ["- \"yo family time?\"", "- \"friends hangout\"", "- \"solo chillin\""],
      5: ["- \"yo sunday scaries\"", "- \"monday blues\"", "- \"weekend over\""],
      6: ["- \"yo binge watch?\"", "- \"movie marathon\"", "- \"series catchup\""],
      7: ["- \"yo shopping?\"", "- \"money spending\"", "- \"saving mode\""],
      8: ["- \"yo hobbies time\"", "- \"project work\"", "- \"learning time\""],
      9: ["- \"yo drinking?\"", "- \"sober weekend\"", "- \"healthy weekend\""]
   },
   pet: {
      0: ["- \"yo got pets?\"", "- \"animal lover?\"", "- \"dog or cat\""],
      1: ["- \"yo dog person?\"", "- \"puppy luv\"", "- \"big dogs\""],
      2: ["- \"yo cat person?\"", "- \"kitten lover\"", "- \"crazy cat guy\""],
      3: ["- \"yo exotic pets?\"", "- \"snake?\"", "- \"lizard?\""],
      4: ["- \"yo bird watcher\"", "- \"parrot?\"", "- \"noise maker\""],
      5: ["- \"yo fish tank?\"", "- \"aquarium?\"", "- \"nemo?\""],
      6: ["- \"yo allergies?\"", "- \"no pets?\"", "- \"sad life\""],
      7: ["- \"yo rescue pet?\"", "- \"adopted?\"", "- \"store bought\""],
      8: ["- \"yo pet name?\"", "- \"cute names\"", "- \"funny name\""],
      9: ["- \"yo fluffy?\"", "- \"hairless?\"", "- \"shedding bad\""]
   },
   travel: {
      0: ["- \"yo travel plans\"", "- \"next trip?\"", "- \"vacation mode\""],
      1: ["- \"yo been abroad?\"", "- \"passport stamp\"", "- \"local trips\""],
      2: ["- \"yo beach trip?\"", "- \"mountain hike\"", "- \"city break\""],
      3: ["- \"yo plane ride?\"", "- \"road trip?\"", "- \"train guy\""],
      4: ["- \"yo solo travel\"", "- \"group tour\"", "- \"family trip\""],
      5: ["- \"yo backpacker?\"", "- \"luxury hotel\"", "- \"hostel life\""],
      6: ["- \"yo bucket list\"", "- \"dream spot\"", "- \"must visit\""],
      7: ["- \"yo language issue\"", "- \"lost in translation\"", "- \"google translate\""],
      8: ["- \"yo food tourism\"", "- \"eat pray love\"", "- \"tasting menu\""],
      9: ["- \"yo homesick?\"", "- \"miss home?\"", "- \"never return\""]
   },
   movie: {
      0: ["- \"yo seen any movies\"", "- \"cinema trip?\"", "- \"netflix rn\""],
      1: ["- \"yo horror fan?\"", "- \"scary movie\"", "- \"jumpscare\""],
      2: ["- \"yo comedy?\"", "- \"funny stuff\"", "- \"laughing rn\""],
      3: ["- \"yo action packed\"", "- \"explosions?\"", "- \"fast furious\""],
      4: ["- \"yo romance?\"", "- \"love story\"", "- \"cheesy movie\""],
      5: ["- \"yo sci fi?\"", "- \"aliens?\"", "- \"space travel\""],
      6: ["- \"yo documentary\"", "- \"learn stuff\"", "- \"real life\""],
      7: ["- \"yo anime movie\"", "- \"ghibli?\"", "- \"shinkai?\""],
      8: ["- \"yo fav actor\"", "- \"celebrity crush\"", "- \"hollywood\""],
      9: ["- \"yo popcorn?\"", "- \"snacks ready\"", "- \"movie night\""]
   }
};

const REPLY_EXAMPLES = {
   0: [
      "- \"yo thats sick\"",
      "- \"real, same here bro\"",
      "- \"ngl that sounds rough\"",
      "- \"aight makes sense\""
   ],
   1: [
      "- \"wait fr?\"",
      "- \"yo nice one\"",
      "- \"lmao true tho\"",
      "- \"no way fr\""
   ],
   2: [
      "- \"damn thats tough\"",
      "- \"sheesh wild\"",
      "- \"yo thats crazy\"",
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
      "- \"yo congrats man\"",
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
      "- \"yo explain pls\"",
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
3. slang style: u, ur, tho, btw, yo, sup, broo, bro, aight
4. NO emojis, NO period at end
5. ONE simple question only - just the question, nothing else
6. DO NOT add random stuff like "pushing through" or describe what they're doing
7. DO NOT repeat common phrases - be creative and unique each time
8. STAY ON TOPIC - only ask what TYPE says, nothing extra
9. DO NOT use the words "vibing", "vibe", "vibes"


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
3. slang: u, ur, tho, btw, rn, ngl, tbh, yo, broo
4. NO emojis, NO period at end
5. ONE simple response only
6. ONLY respond to what they said - do NOT add random stuff
7. DO NOT describe activities like "pushing through" or "staying productive"
8. DO NOT make up context that wasn't in their message
9. DO NOT use the words "vibing", "vibe", "vibes"


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
