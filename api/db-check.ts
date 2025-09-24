import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL
    if (!url) {
      return res.status(500).json({ ok: false, error: 'NEON_DATABASE_URL or DATABASE_URL missing' })
    }

    const pool = new Pool({ connectionString: url })
    const result = await pool.query<{ now: string }>('select now() as now')
    res.json({ ok: true, now: result.rows[0]?.now })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
}
