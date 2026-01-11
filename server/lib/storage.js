import fs from "fs";
import path from "path";

// Check if we're running in Vercel (serverless)
const IS_VERCEL = process.env.VERCEL === "1" || process.env.VERCEL_ENV;

// In-memory storage for serverless environment
let inMemoryUsers = [];
let inMemoryPayments = [];

// Local file paths (only used in non-serverless mode)
const DATA_DIR = path.join(process.cwd(), "data");
const MOCK_USERS_PATH = path.join(DATA_DIR, "mock-users.json");
const PAYMENTS_PATH = path.join(DATA_DIR, "payments.json");

// Initialize local storage only in non-serverless mode
if (!IS_VERCEL) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
    if (!fs.existsSync(MOCK_USERS_PATH)) {
      fs.writeFileSync(MOCK_USERS_PATH, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(PAYMENTS_PATH)) {
      fs.writeFileSync(PAYMENTS_PATH, JSON.stringify([], null, 2));
    }
  } catch (err) {
    console.warn("Could not initialize local storage:", err.message);
  }
}

function loadJSON(jsonPath) {
  if (IS_VERCEL) {
    // Return in-memory data for serverless
    if (jsonPath === MOCK_USERS_PATH) return inMemoryUsers;
    if (jsonPath === PAYMENTS_PATH) return inMemoryPayments;
    return [];
  }

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
  if (IS_VERCEL) {
    if (jsonPath === MOCK_USERS_PATH) {
      inMemoryUsers.push(newEntry);
    } else if (jsonPath === PAYMENTS_PATH) {
      inMemoryPayments.push(newEntry);
    }
    return;
  }

  const existing = loadJSON(jsonPath);
  existing.push(newEntry);
  fs.writeFileSync(jsonPath, JSON.stringify(existing, null, 2), "utf-8");
}

function readMockUsers() {
  return loadJSON(MOCK_USERS_PATH);
}

function writeMockUsers(users) {
  if (IS_VERCEL) {
    inMemoryUsers = users;
    return;
  }
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
};
