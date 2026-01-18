import { createClient } from "@libsql/client";
import { config } from "dotenv";
config({ path: ".env.local" });

async function migrate() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Adding new columns to photos table...");

  const migrations = [
    "ALTER TABLE photos ADD COLUMN uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL",
    "ALTER TABLE photos ADD COLUMN latitude TEXT",
    "ALTER TABLE photos ADD COLUMN longitude TEXT",
    "ALTER TABLE photos ADD COLUMN camera_make TEXT",
    "ALTER TABLE photos ADD COLUMN camera_model TEXT",
  ];

  for (const sql of migrations) {
    try {
      await client.execute(sql);
      console.log(`Success: ${sql.substring(0, 50)}...`);
    } catch (error) {
      if (error.message.includes("duplicate column name")) {
        console.log(`Skipped (already exists): ${sql.substring(0, 50)}...`);
      } else {
        console.error(`Error: ${sql}`);
        console.error(error.message);
      }
    }
  }

  console.log("Migration complete!");
  client.close();
}

migrate().catch(console.error);
