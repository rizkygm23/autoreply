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
};
