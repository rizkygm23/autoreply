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

export {
  sanitizeText,
  estimateTokens,
  estimateRequestTokens,
  removeContractions,
  extractNickname,
};




