// api/_debug/db.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

// Required for serverless WebSocket transport on Vercel Node functions
neonConfig.webSocketConstructor = ws

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL
    if (!url) {
      res.status(500).json({ ok: false, error: 'NEON_DATABASE_URL or DATABASE_URL is not set' })
      return
    }

    // Create a pool; in Vercel functions this can be reused across invocations
    const pool = new Pool({ connectionString: url })

    // Very small query to prove connectivity
    // Using text query keeps it independent of your ORM/migrations
    const result = await pool.query<{ now: string }>('select now() as now')

    // Optionally show which host you’re hitting (useful for debugging)
    const host = url.match(/@([^/]+)/)?.[1] || 'unknown'

    res.json({ ok: true, now: result.rows[0]?.now, host })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
}
