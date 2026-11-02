import type { Job } from 'bullmq';
import { pool } from '../config/db';
import { getTransporter } from '../config/mail';
import { checkRateLimit } from './rateLimiter';
import { notifyRateLimit } from './slackService';

export type EmailJobPayload = {
  emailId: number;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
};

export async function processEmailJob(job: Job<EmailJobPayload>) {
  const { emailId, sender, recipient, subject, body } = job.data;

  const emailRecord = await pool.query('SELECT * FROM emails WHERE id = $1', [emailId]);
  const email = emailRecord.rows[0];

  if (!email) {
    return { skipped: true, reason: 'email-not-found' };
  }

  const hourlyLimit = Number(process.env.MAX_EMAILS_PER_HOUR || 200);
  const rateCheck = await checkRateLimit(sender, hourlyLimit);

  if (!rateCheck.allowed) {
    const { emailQueue } = await import('../config/queue.js');
    await emailQueue.add(
      'send-email',
      job.data,
      {
        delay: Math.max(1000, rateCheck.retryInMs),
        jobId: `email-${emailId}-${Date.now()}`,
      },
    );

    await pool.query(
      'UPDATE emails SET status = $1, updated_at = NOW() WHERE id = $2',
      ['scheduled', emailId],
    );

    await notifyRateLimit(sender, rateCheck.retryInMs);

    return {
      delayed: true,
      retryInMs: rateCheck.retryInMs,
    };
  }

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: sender,
      to: recipient,
      subject,
      text: body,
      html: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
    });

    await pool.query(
      'UPDATE emails SET status = $1, sent_at = NOW(), error = NULL, updated_at = NOW() WHERE id = $2',
      ['sent', emailId],
    );

    return {
      sent: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    const reason = error instanceof Error ? error.message : 'Unknown email error';

    await pool.query(
      'UPDATE emails SET status = $1, error = $2, updated_at = NOW() WHERE id = $3',
      ['failed', reason, emailId],
    );

    throw error;
  }
}
