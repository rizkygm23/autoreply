import fs from "fs";
import { PAYMENTS_PATH, loadJSON } from "../lib/storage.js";
import { addUserTokens } from "./userService.js";

const USE_LOCAL_DB = true;

async function createPayment(userId, txHash, dollarValue, tokenValue) {
  try {
    if (USE_LOCAL_DB) {
      const payments = loadJSON(PAYMENTS_PATH);
      const exists = payments.find((p) => p.arbitrum_txhash === txHash);
      if (exists) return exists;
      const payment = {
        id: payments.length ? Math.max(...payments.map((p) => p.id || 0)) + 1 : 1,
        user_id: userId,
        arbitrum_txhash: txHash,
        valueDollar: dollarValue,
        valueToken: tokenValue,
        status: "pending",
        created_at: new Date().toISOString(),
      };
      fs.writeFileSync(PAYMENTS_PATH, JSON.stringify([...payments, payment], null, 2));
      return payment;
    }
    throw new Error("Supabase disabled in local mode");
  } catch (error) {
    console.error("Error creating payment:", error);
    throw error;
  }
}

async function confirmPayment(txHash) {
  try {
    if (USE_LOCAL_DB) {
      const payments = loadJSON(PAYMENTS_PATH);
      const idx = payments.findIndex((p) => p.arbitrum_txhash === txHash);
      if (idx === -1) return null;
      payments[idx].status = "confirmed";
      payments[idx].confirmed_at = new Date().toISOString();
      fs.writeFileSync(PAYMENTS_PATH, JSON.stringify(payments, null, 2));
      await addUserTokens(payments[idx].user_id, payments[idx].valueToken);
      return payments[idx];
    }
    throw new Error("Supabase disabled in local mode");
  } catch (error) {
    console.error("Error confirming payment:", error);
    throw error;
  }
}

export { createPayment, confirmPayment };











