import { drizzle } from "drizzle-orm/libsql";
import { createClient, Client } from "@libsql/client";
import * as schema from "./schema";

let client: Client | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getClient(): Client {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    if (!dbInstance) {
      dbInstance = drizzle(getClient(), { schema });
    }
    return (dbInstance as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export * from "./schema";
