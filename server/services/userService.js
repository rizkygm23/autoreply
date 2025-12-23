import {
  readMockUsers,
  writeMockUsers,
  findMockUserByEmail,
  findMockUserById,
  DATA_DIR,
} from "../lib/storage.js";
import { isOfflineError } from "../lib/helpers.js";
import fs from "fs";
import path from "path";

const USE_LOCAL_DB = true;

async function createUser(email, password, roomData = {}) {
  try {
    if (USE_LOCAL_DB) {
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

    const defaultRooms = ["rialo", "lighter", "creek", "cys", "town", "fgo"];
    const defaultRoomData = {};

    for (const room of defaultRooms) {
      try {
        const roomFilePath = path.join(DATA_DIR, `${room}.json`);
        if (fs.existsSync(roomFilePath)) {
          const roomContent = fs.readFileSync(roomFilePath, "utf-8");
          defaultRoomData[room] = JSON.parse(roomContent);
        }
      } catch (err) {
        console.warn(`Failed to load room data for ${room}: ${err.message}`);
      }
    }

    const { data, error } = await supabase
      .from("user")
      .insert({
        user_mail: email,
        user_password: password,
        user_room: defaultRooms,
        user_room_data: { ...defaultRoomData, ...roomData },
        user_token: 200000,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("User already exists");
      }
      throw error;
    }

    return data;
  } catch (error) {
    if (isOfflineError(error)) {
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
      users.push(newUser);
      writeMockUsers(users);
      return newUser;
    }
    console.error("Error creating user:", error);
    throw error;
  }
}

async function getUserByEmail(email) {
  try {
    if (USE_LOCAL_DB) {
      return findMockUserByEmail(email);
    }
    const { data, error } = await supabase
      .from("user")
      .select("*")
      .eq("user_mail", email)
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    if (isOfflineError(error)) {
      return findMockUserByEmail(email);
    }
    console.error("Error getting user:", error);
    throw error;
  }
}

async function authenticateUser(email, password) {
  try {
    if (USE_LOCAL_DB) {
      const u = findMockUserByEmail(email);
      if (u && u.user_password === password && u.is_active !== false) return u;
      return null;
    }
    const { data, error } = await supabase
      .from("user")
      .select("*")
      .eq("user_mail", email)
      .eq("user_password", password)
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    if (isOfflineError(error)) {
      const u = findMockUserByEmail(email);
      if (u && u.user_password === password && u.is_active !== false) return u;
      return null;
    }
    console.error("Error authenticating user:", error);
    throw error;
  }
}

async function getUserById(userId) {
  try {
    if (USE_LOCAL_DB) {
      return findMockUserById(userId);
    }
    const { data, error } = await supabase
      .from("user")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    if (isOfflineError(error)) {
      return findMockUserById(userId);
    }
    console.error("Error getting user by ID:", error);
    throw error;
  }
}

async function checkUserTokens(userId, requiredTokens) {
  try {
    if (USE_LOCAL_DB) {
      const u = findMockUserById(userId);
      return !!(u && Number(u.user_token) >= Number(requiredTokens));
    }
    const { data, error } = await supabase.rpc("check_user_tokens", {
      p_user_id: userId,
      p_required_tokens: requiredTokens,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    if (isOfflineError(error)) {
      const u = findMockUserById(userId);
      return !!(u && Number(u.user_token) >= Number(requiredTokens));
    }
    console.error("Error checking user tokens:", error);
    return false;
  }
}

async function deductUserTokens(userId, tokensToDeduct) {
  try {
    if (USE_LOCAL_DB) {
      const users = readMockUsers();
      const idx = users.findIndex((u) => u.user_id === userId);
      if (idx >= 0) {
        users[idx].user_token = Math.max(0, Number(users[idx].user_token || 0) - Number(tokensToDeduct || 0));
        writeMockUsers(users);
        return true;
      }
    }
    const { data, error } = await supabase.rpc("deduct_user_tokens", {
      p_user_id: userId,
      p_tokens_to_deduct: tokensToDeduct,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    if (isOfflineError(error)) {
      const users = readMockUsers();
      const idx = users.findIndex((u) => u.user_id === userId);
      if (idx >= 0) {
        users[idx].user_token = Math.max(0, Number(users[idx].user_token || 0) - Number(tokensToDeduct || 0));
        writeMockUsers(users);
        return true;
      }
      return false;
    }
    console.error("Error deducting user tokens:", error);
    return false;
  }
}

async function addUserTokens(userId, tokensToAdd) {
  try {
    if (USE_LOCAL_DB) {
      const users = readMockUsers();
      const idx = users.findIndex((u) => u.user_id === userId);
      if (idx >= 0) {
        users[idx].user_token = Number(users[idx].user_token || 0) + Number(tokensToAdd || 0);
        writeMockUsers(users);
        return true;
      }
      return false;
    }
    const { data, error } = await supabase.rpc("add_user_tokens", {
      p_user_id: userId,
      p_tokens_to_add: tokensToAdd,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    if (isOfflineError(error)) {
      const users = readMockUsers();
      const idx = users.findIndex((u) => u.user_id === userId);
      if (idx >= 0) {
        users[idx].user_token = Number(users[idx].user_token || 0) + Number(tokensToAdd || 0);
        writeMockUsers(users);
        return true;
      }
      return false;
    }
    console.error("Error adding user tokens:", error);
    return false;
  }
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











