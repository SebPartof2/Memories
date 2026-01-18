import { createClient } from "@libsql/client";
import { config } from "dotenv";
config({ path: ".env.local" });

async function migrate() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Creating whitelist table...");

  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS whitelist (
        email TEXT PRIMARY KEY,
        is_admin INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    console.log("Whitelist table created successfully!");
  } catch (error) {
    console.error("Error creating whitelist table:", error.message);
  }

  client.close();
}

migrate().catch(console.error);
