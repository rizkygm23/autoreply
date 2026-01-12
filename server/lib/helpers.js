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
    "what's": "what is",
    "how's": "how is",
    "when's": "when is",
    "where's": "where is",
    "who's": "who is",
    "it's": "it is",
    "that's": "that is",
    "here's": "here is",
    "there's": "there is",
    "I'm": "I am",
    "you're": "you are",
    "we're": "we are",
    "they're": "they are",
    "he's": "he is",
    "she's": "she is",
    "let's": "let us",
    "can't": "cannot",
    "won't": "will not",
    "don't": "do not",
    "doesn't": "does not",
    "didn't": "did not",
    "hasn't": "has not",
    "haven't": "have not",
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not",
  };

  let result = text;

  Object.entries(contractions).forEach(([contraction, fullForm]) => {
    const regex = new RegExp(`\\b${contraction.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    result = result.replace(regex, fullForm);
  });

  return result;
}

export {
  sanitizeText,
  estimateTokens,
  estimateRequestTokens,
  removeContractions,
  extractNickname,
};




