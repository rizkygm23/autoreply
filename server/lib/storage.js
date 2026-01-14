import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const MOCK_USERS_PATH = path.join(DATA_DIR, "mock-users.json");
if (!fs.existsSync(MOCK_USERS_PATH)) {
  fs.writeFileSync(MOCK_USERS_PATH, JSON.stringify([], null, 2));
}

const PAYMENTS_PATH = path.join(DATA_DIR, "payments.json");
if (!fs.existsSync(PAYMENTS_PATH)) {
  fs.writeFileSync(PAYMENTS_PATH, JSON.stringify([], null, 2));
}

// === Response Memory System ===
// Stores last N responses per platform/room to avoid repetition
const RESPONSE_MEMORY_PATH = path.join(DATA_DIR, "response-memory.json");
if (!fs.existsSync(RESPONSE_MEMORY_PATH)) {
  fs.writeFileSync(RESPONSE_MEMORY_PATH, JSON.stringify({}, null, 2));
}

const MAX_MEMORY_SIZE = 10; // Store last 10 responses per room

/**
 * Get recent responses for a specific room/platform
 * @param {string} platform - "discord" | "twitter" 
 * @param {string} roomId - Room/community identifier
 * @returns {string[]} - Array of recent responses
 */
function getRecentResponses(platform, roomId) {
  try {
    const memory = loadJSON(RESPONSE_MEMORY_PATH);
    const key = `${platform}:${roomId}`;
    return memory[key] || [];
  } catch (err) {
    console.warn(`Failed to get response memory: ${err.message}`);
    return [];
  }
}

/**
 * Save a new response to memory
 * @param {string} platform - "discord" | "twitter"
 * @param {string} roomId - Room/community identifier  
 * @param {string} response - The generated response text
 */
function saveResponseToMemory(platform, roomId, response) {
  try {
    const memory = loadJSON(RESPONSE_MEMORY_PATH);
    const key = `${platform}:${roomId}`;

    if (!memory[key]) {
      memory[key] = [];
    }

    // Add new response
    memory[key].unshift({
      response: response.toLowerCase().trim(),
      timestamp: Date.now()
    });

    // Keep only last N responses
    if (memory[key].length > MAX_MEMORY_SIZE) {
      memory[key] = memory[key].slice(0, MAX_MEMORY_SIZE);
    }

    fs.writeFileSync(RESPONSE_MEMORY_PATH, JSON.stringify(memory, null, 2), "utf-8");
  } catch (err) {
    console.warn(`Failed to save response to memory: ${err.message}`);
  }
}

/**
 * Check if a response is too similar to recent responses
 * @param {string} platform - "discord" | "twitter"
 * @param {string} roomId - Room/community identifier
 * @param {string} newResponse - The new response to check
 * @returns {boolean} - true if response is duplicate/too similar
 */
function isResponseDuplicate(platform, roomId, newResponse) {
  const recentResponses = getRecentResponses(platform, roomId);
  const normalized = newResponse.toLowerCase().trim();

  for (const item of recentResponses) {
    const recent = item.response;

    // Exact match
    if (recent === normalized) return true;

    // Very similar (>80% overlap)
    if (calculateSimilarity(recent, normalized) > 0.8) return true;
  }

  return false;
}

/**
 * Get list of recent response texts for prompt injection
 * @param {string} platform 
 * @param {string} roomId 
 * @returns {string} - Formatted string of recent responses
 */
function getRecentResponsesText(platform, roomId) {
  const responses = getRecentResponses(platform, roomId);
  if (responses.length === 0) return "";

  return responses.map((r, i) => `${i + 1}. "${r.response}"`).join("\n");
}

/**
 * Simple similarity calculation (Jaccard-like)
 */
function calculateSimilarity(str1, str2) {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));

  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;

  return union === 0 ? 0 : intersection / union;
}

function loadJSON(jsonPath) {
  try {
    if (fs.existsSync(jsonPath)) {
      const raw = fs.readFileSync(jsonPath, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`Failed to read JSON file: ${jsonPath}`);
  }
  return [];
}

function saveEntryToJSON(jsonPath, newEntry) {
  const existing = loadJSON(jsonPath);
  existing.push(newEntry);
  fs.writeFileSync(jsonPath, JSON.stringify(existing, null, 2), "utf-8");
}

function readMockUsers() {
  return loadJSON(MOCK_USERS_PATH);
}

function writeMockUsers(users) {
  fs.writeFileSync(MOCK_USERS_PATH, JSON.stringify(users, null, 2), "utf-8");
}

function findMockUserByEmail(email) {
  const users = readMockUsers();
  return users.find((u) => u.user_mail === email) || null;
}

function findMockUserById(userId) {
  const users = readMockUsers();
  return users.find((u) => u.user_id === userId) || null;
}

export {
  DATA_DIR,
  MOCK_USERS_PATH,
  PAYMENTS_PATH,
  loadJSON,
  saveEntryToJSON,
  readMockUsers,
  writeMockUsers,
  findMockUserByEmail,
  findMockUserById,
  // Response memory functions
  getRecentResponses,
  saveResponseToMemory,
  isResponseDuplicate,
  getRecentResponsesText,
};
