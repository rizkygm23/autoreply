function sanitizeText(text) {
  return text.replace(/"/g, "").replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

function estimateRequestTokens(prompt, roomData, userRoom) {
  let totalTokens = 0;
  totalTokens += estimateTokens(prompt);

  if (roomData && typeof roomData === "object") {
    const roomDataText = JSON.stringify(roomData);
    totalTokens += estimateTokens(roomDataText);
  }

  if (userRoom && Array.isArray(userRoom)) {
    const userRoomText = userRoom.join(" ");
    totalTokens += estimateTokens(userRoomText);
  }

  return totalTokens;
}



/**
 * Extracts a simple nickname from a Discord username
 * Examples:
 * - "Arya | Bharat Maxi" → "Arya"
 * - "John_Smith123" → "John"
 * - "CryptoKing | ETH Maxi | 🚀" → "CryptoKing"
 * - "xX_DarkLord_Xx" → "DarkLord"
 * @param {string} username - Full username from Discord
 * @returns {string} - Simple nickname
 */
function extractNickname(username) {
  if (!username) return "";

  // Common separators in Discord usernames
  const separators = /[|·\-_.\s]+/;

  // Split by separators and get the first meaningful part
  const parts = username.split(separators).filter(part => part.trim().length > 0);

  if (parts.length === 0) return "";

  // Get the first part
  let nickname = parts[0].trim();

  // Remove common prefixes/suffixes like xX_ or _Xx, numbers at the end
  nickname = nickname
    .replace(/^[xX]{1,2}[_]*/, "") // Remove xX_ prefix
    .replace(/[_]*[xX]{1,2}$/, "") // Remove _Xx suffix
    .replace(/\d+$/, "") // Remove trailing numbers
    .replace(/[^\w\s]/g, "") // Remove special characters except letters and spaces
    .trim();

  // If still empty, try to use parts[1] or return cleaned original
  if (!nickname && parts.length > 1) {
    nickname = parts[1].trim().replace(/[^\w\s]/g, "").replace(/\d+$/, "").trim();
  }

  // If still nothing, return original username cleaned
  if (!nickname) {
    nickname = username.replace(/[^\w\s]/g, "").replace(/\d+$/, "").trim().split(/\s+/)[0] || "";
  }

  // Capitalize first letter
  if (nickname.length > 0) {
    nickname = nickname.charAt(0).toUpperCase() + nickname.slice(1).toLowerCase();
  }

  return nickname;
}

function removeContractions(text) {
  if (!text) return text;

  const contractions = {
    // 's contractions (is/has)
    "what's": "what is",
    "how's": "how is",
    "when's": "when is",
    "where's": "where is",
    "who's": "who is",
    "it's": "it is",
    "that's": "that is",
    "here's": "here is",
    "there's": "there is",
    "he's": "he is",
    "she's": "she is",
    "let's": "let us",
    "one's": "one is",
    "everyone's": "everyone is",
    "someone's": "someone is",
    "anyone's": "anyone is",
    "nobody's": "nobody is",
    "everything's": "everything is",
    "something's": "something is",
    "nothing's": "nothing is",
    "today's": "today is",
    "tomorrow's": "tomorrow is",
    "yesterday's": "yesterday was",
    "life's": "life is",
    "love's": "love is",
    "time's": "time is",
    "man's": "man is",
    "world's": "world is",

    // 'm contractions
    "I'm": "I am",
    "i'm": "i am",

    // 're contractions
    "you're": "you are",
    "we're": "we are",
    "they're": "they are",

    // 've contractions
    "I've": "I have",
    "i've": "i have",
    "you've": "you have",
    "we've": "we have",
    "they've": "they have",

    // 'll contractions
    "I'll": "I will",
    "i'll": "i will",
    "you'll": "you will",
    "we'll": "we will",
    "they'll": "they will",
    "he'll": "he will",
    "she'll": "she will",
    "it'll": "it will",
    "that'll": "that will",

    // 'd contractions
    "I'd": "I would",
    "i'd": "i would",
    "you'd": "you would",
    "we'd": "we would",
    "they'd": "they would",
    "he'd": "he would",
    "she'd": "she would",
    "it'd": "it would",
    "that'd": "that would",

    // n't contractions
    "can't": "cannot",
    "won't": "will not",
    "don't": "do not",
    "doesn't": "does not",
    "didn't": "did not",
    "hasn't": "has not",
    "haven't": "have not",
    "hadn't": "had not",
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not",
    "wouldn't": "would not",
    "couldn't": "could not",
    "shouldn't": "should not",
    "mustn't": "must not",
    "needn't": "need not",
    "ain't": "is not",
  };

  let result = text;

  Object.entries(contractions).forEach(([contraction, fullForm]) => {
    const regex = new RegExp(`\\b${contraction.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    result = result.replace(regex, fullForm);
  });

  // Fallback: catch any remaining 's patterns and convert to "is"
  // This handles cases like "name's" -> "name is", "thing's" -> "thing is"
  result = result.replace(/(\w+)'s\b/gi, (match, word) => {
    // Skip possessive cases that don't make sense as "is" 
    // (we'll just remove the 's for those)
    const lowerWord = word.toLowerCase();
    // Common words that should use "is"
    const useIs = ['it', 'that', 'this', 'what', 'who', 'how', 'where', 'when', 'why', 'there', 'here', 'he', 'she', 'everyone', 'someone', 'anyone', 'nobody', 'everybody', 'somebody', 'anybody', 'everything', 'something', 'nothing', 'one'];
    if (useIs.includes(lowerWord)) {
      return `${word} is`;
    }
    // For other words, just remove the 's (possessive -> no apostrophe)
    return word;
  });

  // Also remove any remaining apostrophes that might be left
  result = result.replace(/(\w+)'(\w+)/g, "$1$2");

  return result;
}

/**
 * Gets user's current time context for realistic Discord replies
 * Based on WIB timezone (UTC+7)
 * User profile: IT student semester 5, active in Web3 projects
 * Activities: artwork creation, article writing, Discord/Twitter community engagement
 * 
 * @returns {Object} - Contains hour, period, mood, condition, energy, activities, reason
 */
function getUserTimeContext() {
  // Get current time in WIB (UTC+7)
  const now = new Date();
  const wibOffset = 7 * 60; // WIB is UTC+7
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wibTime = new Date(utc + (wibOffset * 60000));
  const hour = wibTime.getHours();
  const dayOfWeek = wibTime.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  let period, mood, condition, energy, activities, reason, greeting;

  // === EARLY MORNING: 04:00 - 06:59 ===
  if (hour >= 4 && hour < 7) {
    period = "early morning";
    greeting = "morning";
    energy = "low-medium";
    if (isWeekend) {
      mood = ["sleepy but peaceful", "just woke up early for no reason", "enjoying quiet morning vibes"];
      condition = ["still half asleep", "getting coffee first", "peaceful morning mindset"];
      activities = ["scrolling discord early", "checking overnight notifications", "enjoying the silence"];
      reason = ["weekend means flexible schedule", "love the quiet morning hours", "catching up on web3 news before everyone wakes up"];
    } else {
      mood = ["groggy but getting ready", "slowly waking up", "morning zombie mode"];
      condition = ["need coffee badly", "preparing for classes later", "checking notifications first thing"];
      activities = ["quick discord check before getting ready", "reviewing today's tasks", "reading overnight messages"];
      reason = ["early prep for campus schedule", "want to clear notifications before class", "morning grind starts early"];
    }
  }

  // === MORNING PRIME: 07:00 - 09:59 ===
  else if (hour >= 7 && hour < 10) {
    period = "morning";
    greeting = "gm";
    energy = "rising";
    if (isWeekend) {
      mood = ["chill and relaxed", "enjoying slow morning", "finally awake properly"];
      condition = ["taking it easy", "good vibes", "productive mindset kicking in"];
      activities = ["working on artwork", "catching up on project threads", "exploring new web3 stuff"];
      reason = ["weekend = personal project time", "no campus pressure today", "best time for creative work"];
    } else {
      mood = ["energized", "ready for the day", "motivated morning mode"];
      condition = ["fresh and focused", "campus-ready mindset", "good energy"];
      activities = ["checking crypto news", "quick community engagement", "preparing for lectures"];
      reason = ["morning lecture schedule", "peak focus hours", "gotta stay updated before class"];
    }
  }

  // === LATE MORNING: 10:00 - 11:59 ===
  else if (hour >= 10 && hour < 12) {
    period = "late morning";
    greeting = "morning";
    energy = "high";
    if (isWeekend) {
      mood = ["in the zone", "creative flow state", "super productive"];
      condition = ["deep work mode", "fully focused", "crushing tasks"];
      activities = ["creating artwork", "writing articles", "web3 project contributions"];
      reason = ["peak creative hours", "weekend project grinding", "best time for focused work"];
    } else {
      mood = ["focused but tired from lectures", "post-class energy", "need a break soon"];
      condition = ["semi-focused", "class brain fog", "looking forward to break"];
      activities = ["quick discord breaks between classes", "reading project updates", "light engagement"];
      reason = ["campus lectures in progress", "sneaking phone during boring class", "mental break needed"];
    }
  }

  // === NOON: 12:00 - 13:59 ===
  else if (hour >= 12 && hour < 14) {
    period = "afternoon";
    greeting = "afternoon";
    energy = "medium";
    mood = ["a bit tired", "lunch mode", "recharging"];
    condition = ["need food", "taking a break", "post-lunch lazy"];
    activities = ["lunch break scrolling", "chill discord time", "light community engagement"];
    reason = ["lunch break from campus/work", "food coma incoming", "recharging for afternoon tasks"];
  }

  // === AFTERNOON: 14:00 - 16:59 ===
  else if (hour >= 14 && hour < 17) {
    period = "afternoon";
    greeting = "afternoon";
    energy = "medium";
    if (isWeekend) {
      mood = ["productive afternoon", "getting stuff done", "focused grind"];
      condition = ["in work mode", "project focus", "steady vibes"];
      activities = ["web3 project work", "community contributions", "discord moderation help"];
      reason = ["best afternoon hours for contributions", "catching up with community", "project deadline vibes"];
    } else {
      mood = ["post-lunch slowdown", "afternoon class drag", "counting hours"];
      condition = ["a bit sleepy", "class fatigue", "looking forward to evening"];
      activities = ["surviving afternoon classes", "quick phone checks", "planning evening tasks"];
      reason = ["afternoon lectures are tough", "body wants to nap", "campus grind continues"];
    }
  }

  // === EVENING PRIME: 17:00 - 19:59 ===
  else if (hour >= 17 && hour < 20) {
    period = "evening";
    greeting = "evening";
    energy = "refreshed";
    mood = ["relaxed and free", "finally off campus mode", "evening productivity"];
    condition = ["winding down but active", "chill vibes", "peak social hours"];
    activities = ["full discord engagement", "community chatting", "working on artwork", "writing drafts"];
    reason = ["campus done for the day", "prime time for web3 engagement", "evening is contribution time"];
  }

  // === NIGHT PRIME: 20:00 - 22:59 ===
  else if (hour >= 20 && hour < 23) {
    period = "night";
    greeting = "evening";
    energy = "high-medium";
    mood = ["peak active hours", "night owl mode activated", "productive and engaged"];
    condition = ["fully focused", "creative energy flowing", "deep work time"];
    activities = ["heavy discord engagement", "artwork creation", "article writing", "project contributions"];
    reason = ["best hours for creative work", "no distractions at night", "web3 never sleeps and neither do i"];
  }

  // === LATE NIGHT: 23:00 - 00:59 ===
  else if (hour >= 23 || hour === 0) {
    period = "late night";
    greeting = "night";
    energy = "declining";
    mood = ["starting to feel tired", "pushing through", "night grind continues"];
    condition = ["a bit sleepy but still going", "should sleep soon", "eyes getting heavy"];
    activities = ["finishing up tasks", "last discord checks", "winding down projects"];
    reason = ["deadline push", "good momentum so kept going", "web3 updates happening in other timezones"];
  }

  // === MIDNIGHT: 01:00 - 02:59 ===
  else if (hour >= 1 && hour < 3) {
    period = "very late night";
    greeting = "still up huh";
    energy = "low";
    mood = ["exhausted but still here", "sleepy af", "running on fumes"];
    condition = ["need to sleep", "too stubborn to quit", "zombie mode"];
    activities = ["random late night scrolling", "probably should sleep", "watching crypto charts"];
    reason = ["insomnia vibes", "got too invested in a thread", "degen hours", "assignment deadline stress"];
  }

  // === DEEP NIGHT: 03:00 - 03:59 ===
  else {
    period = "very late/early hours";
    greeting = "you still awake?";
    energy = "very low";
    mood = ["completely drained", "should definitely be sleeping", "3am brain"];
    condition = ["exhausted", "barely functioning", "questioning life choices"];
    activities = ["insomniac scrolling", "nothing productive", "contemplating sleep"];
    reason = ["cant sleep", "deadline panic", "forgot to sleep", "web3 rabbit hole went too deep"];
  }

  // Randomly select from arrays to add variety
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  return {
    hour,
    period,
    greeting,
    isWeekend,
    dayOfWeek,
    mood: pick(mood),
    condition: pick(condition),
    energy,
    currentActivities: pick(activities),
    reason: pick(reason),
    // Full context string for prompt injection
    contextString: `[Current Time Context - WIB]
Time: ${hour}:00 WIB (${period})
Day: ${isWeekend ? 'Weekend' : 'Weekday'}
My current state: ${pick(mood)}
My condition: ${pick(condition)}
Energy level: ${energy}
What I'm doing: ${pick(activities)}
Why: ${pick(reason)}

USER PROFILE: IT student semester 5, active Web3 contributor (artwork, articles, community engagement on Discord/Twitter)

INSTRUCTION: When replying to questions like "how are you?", "what's up?", "busy?", "capek ga?", "apa kabar?", etc., incorporate this time context naturally. Make responses feel authentic to my current state and schedule. Don't be overly descriptive - just let it subtly influence the tone and energy of responses.`
  };
}

export {
  sanitizeText,
  estimateTokens,
  estimateRequestTokens,
  removeContractions,
  extractNickname,
  getUserTimeContext,
};




