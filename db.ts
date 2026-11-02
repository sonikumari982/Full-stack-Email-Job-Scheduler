import { Pool } from 'pg';
import { env } from './env';

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function initDatabase(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS emails (
      id SERIAL PRIMARY KEY,
      sender VARCHAR(255) NOT NULL,
      recipient VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      scheduled_for TIMESTAMPTZ NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
      queue_job_id VARCHAR(255),
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      error TEXT
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_emails_status_scheduled_for
    ON emails (status, scheduled_for);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_emails_recipient
    ON emails (recipient);
  `);
}
