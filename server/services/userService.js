import {
  readMockUsers,
  writeMockUsers,
  findMockUserByEmail,
  findMockUserById,
} from "../lib/storage.js";

async function createUser(email, password, roomData = {}) {
  const exists = findMockUserByEmail(email);
  if (exists) throw new Error("User already exists");
  const users = readMockUsers();
  const newUser = {
    user_id: users.length ? Math.max(...users.map((u) => u.user_id || 0)) + 1 : 1,
    user_mail: email,
    user_password: password,
    user_room: ["rialo", "lighter", "creek", "cys", "town", "fgo"],
    user_room_data: roomData || {},
    user_token: 200000,
    is_active: true,
    created_at: new Date().toISOString(),
  };
  writeMockUsers([...users, newUser]);
  return newUser;
}

async function getUserByEmail(email) {
  return findMockUserByEmail(email);
}

async function authenticateUser(email, password) {
  const u = findMockUserByEmail(email);
  if (u && u.user_password === password && u.is_active !== false) return u;
  return null;
}

async function getUserById(userId) {
  return findMockUserById(userId);
}

async function checkUserTokens(userId, requiredTokens) {
  const u = findMockUserById(userId);
  return !!(u && Number(u.user_token) >= Number(requiredTokens));
}

async function deductUserTokens(userId, tokensToDeduct) {
  const users = readMockUsers();
  const idx = users.findIndex((u) => u.user_id === userId);
  if (idx >= 0) {
    users[idx].user_token = Math.max(0, Number(users[idx].user_token || 0) - Number(tokensToDeduct || 0));
    writeMockUsers(users);
    return true;
  }
  return false;
}

async function addUserTokens(userId, tokensToAdd) {
  const users = readMockUsers();
  const idx = users.findIndex((u) => u.user_id === userId);
  if (idx >= 0) {
    users[idx].user_token = Number(users[idx].user_token || 0) + Number(tokensToAdd || 0);
    writeMockUsers(users);
    return true;
  }
  return false;
}

export {
  createUser,
  getUserByEmail,
  authenticateUser,
  getUserById,
  checkUserTokens,
  deductUserTokens,
  addUserTokens,
};











