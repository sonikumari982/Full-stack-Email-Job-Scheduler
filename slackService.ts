import { redis } from '../config/redis';
import { env } from '../config/env';

export async function saveSlackWebhook(webhookUrl: string): Promise<void> {
  await redis.set('slack:webhook', webhookUrl);
}

export async function getSlackWebhook(): Promise<string | null> {
  return redis.get('slack:webhook');
}

export async function notifyRateLimit(sender: string, retryInMs: number): Promise<boolean> {
  const webhook = (await getSlackWebhook()) || env.slackWebhookUrl;
  if (!webhook) {
    return false;
  }

  const delayMinutes = Math.max(1, Math.ceil(retryInMs / 60000));

  const payload = {
    text: `🚨 Rate limit reached for sender ${sender}. Emails are being delayed for approximately ${delayMinutes} minute(s).`,
  };

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (error) {
    console.error('Slack failure:', error);
    return false;
  }
}
