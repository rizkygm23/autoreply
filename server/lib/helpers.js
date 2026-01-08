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
};




