import type { Request, Response } from 'express';
import { pool } from '../config/db';
import { emailQueue } from '../config/queue';
import { searchEmails } from '../services/searchService';
import { env } from '../config/env';

function parseLeadList(raw: string): string[] {
  return raw
    .split(/\r?\n|,|;/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => entry.includes('@'));
}

export async function scheduleEmail(req: Request, res: Response): Promise<void> {
  try {
    const {
      sender = env.defaultSender,
      subject,
      body,
      recipients,
      csv,
      startTime,
      delayBetweenMs,
      hourlyLimit,
    } = req.body ?? {};

    const emailList = Array.isArray(recipients)
      ? recipients
      : parseLeadList(typeof csv === 'string' ? csv : '');

    if (!subject || !body || emailList.length === 0) {
      res.status(400).json({
        message: 'Subject, body, and at least one recipient are required.',
      });
      return;
    }

    const startDate = startTime ? new Date(startTime) : new Date(Date.now() + 1000 * 60);
    const baseDelay = Number(delayBetweenMs ?? env.minDelayBetweenEmailsMs);
    const limit = Number(hourlyLimit ?? env.maxEmailsPerHour);

    const createdEmails: any[] = [];

    for (const [index, recipient] of emailList.entries()) {
      const scheduledTime = new Date(startDate.getTime() + index * baseDelay);
      const insertResult = await pool.query(
        `
          INSERT INTO emails (sender, recipient, subject, body, scheduled_for, status, queue_job_id, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, 'scheduled', $6, NOW(), NOW())
          RETURNING *;
        `,
        [sender, recipient, subject, body, scheduledTime.toISOString(), `email-${Date.now()}-${index}`],
      );

      const email = insertResult.rows[0];

      const delayMs = Math.max(0, scheduledTime.getTime() - Date.now());
      const queueJob = await emailQueue.add(
        'send-email',
        {
          emailId: Number(email.id),
          sender,
          recipient,
          subject,
          body,
          hourlyLimit: limit,
        },
        {
          delay: delayMs,
          jobId: `email-${email.id}-${index}`,
        },
      );

      await pool.query('UPDATE emails SET queue_job_id = $1, updated_at = NOW() WHERE id = $2', [queueJob.id, email.id]);
      createdEmails.push({
        ...email,
        queueJobId: queueJob.id,
      });
    }

    res.status(201).json({
      message: 'Emails scheduled successfully.',
      count: createdEmails.length,
      emails: createdEmails,
    });
  } catch (error: any) {
    console.error('Failed to schedule emails:', error);
    res.status(500).json({
      message: 'Failed to schedule emails.',
      error: error?.message ?? String(error),
    });
  }
}

export async function listScheduledEmails(_req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT * FROM emails WHERE status = 'scheduled' ORDER BY scheduled_for ASC LIMIT 100;`,
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ message: 'Unable to load scheduled emails.', error: error.message });
  }
}

export async function listSentEmails(_req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT * FROM emails WHERE status IN ('sent', 'failed') ORDER BY sent_at DESC NULLS LAST LIMIT 100;`,
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ message: 'Unable to load sent emails.', error: error.message });
  }
}

export async function searchScheduledAndSent(req: Request, res: Response): Promise<void> {
  try {
    const { q = '', status } = req.query;
    const rows = await searchEmails(String(q), status ? String(status) : undefined);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: 'Search failed.', error: error.message });
  }
}

export async function getQueueOverview(_req: Request, res: Response): Promise<void> {
  try {
    const [waiting, delayed, active, completed, failed, total] = await Promise.all([
      emailQueue.getWaiting(),
      emailQueue.getDelayed(),
      emailQueue.getActive(),
      emailQueue.getCompleted(),
      emailQueue.getFailed(),
      emailQueue.getJobCounts(),
    ]);

    res.json({
      waiting: waiting.length,
      delayed: delayed.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: total,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Unable to load queue overview.', error: error.message });
  }
}
