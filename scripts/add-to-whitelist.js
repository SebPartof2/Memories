import { createClient } from "@libsql/client";
import { config } from "dotenv";
config({ path: ".env.local" });

const email = process.argv[2];
const isAdmin = process.argv[3] === "--admin";

if (!email) {
  console.log("Usage: node scripts/add-to-whitelist.js <email> [--admin]");
  console.log("");
  console.log("Examples:");
  console.log("  node scripts/add-to-whitelist.js user@example.com");
  console.log("  node scripts/add-to-whitelist.js admin@example.com --admin");
  process.exit(1);
}

async function addToWhitelist() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    await client.execute({
      sql: `INSERT INTO whitelist (email, is_admin, created_at) VALUES (?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET is_admin = excluded.is_admin`,
      args: [email.toLowerCase(), isAdmin ? 1 : 0, Math.floor(Date.now() / 1000)],
    });
    console.log(`Added ${email} to whitelist${isAdmin ? " as admin" : ""}`);
  } catch (error) {
    console.error("Error:", error.message);
  }

  client.close();
}

addToWhitelist().catch(console.error);
