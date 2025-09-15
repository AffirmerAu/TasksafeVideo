import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Force use of NEON_DATABASE_URL to ensure we connect to the correct database
const databaseUrl = process.env.NEON_DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "NEON_DATABASE_URL must be set. Please configure your Neon database connection.",
  );
}

// Log which database we're connecting to (for debugging)
console.log(`🔗 Connecting to database: Neon PostgreSQL`);
const hostname = databaseUrl.match(/@([^/]+)/)?.[1] || 'unknown';
console.log(`🔗 Database host: ${hostname}`);

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });