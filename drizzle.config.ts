// drizzle.config.ts (at repo root)
import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  schema: './server/shared/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL!,
  },
})
