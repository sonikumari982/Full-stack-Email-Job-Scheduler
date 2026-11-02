import { Router } from 'express';
import {
  getQueueOverview,
  listScheduledEmails,
  listSentEmails,
  scheduleEmail,
  searchScheduledAndSent,
} from '../controllers/emailController';
import { getGoogleAuthUrl, googleCallback } from '../controllers/authController';
import { env } from '../config/env';
import { getSlackWebhook, saveSlackWebhook } from '../services/slackService';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: env.appName });
});

apiRouter.post('/emails/schedule', scheduleEmail);
apiRouter.get('/emails/scheduled', listScheduledEmails);
apiRouter.get('/emails/sent', listSentEmails);
apiRouter.get('/emails/search', searchScheduledAndSent);
apiRouter.get('/queue/overview', getQueueOverview);

apiRouter.get('/auth/google', getGoogleAuthUrl);
apiRouter.get('/auth/google/callback', googleCallback);

apiRouter.get('/slack/oauth-url', (_req, res) => {
  const url = `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID ?? ''}&scope=chat:write&redirect_uri=${encodeURIComponent(process.env.SLACK_REDIRECT_URI ?? 'http://localhost:4000/api/slack/callback')}`;
  res.json({ url: url || null });
});

apiRouter.post('/slack/connect', async (req, res) => {
  const { webhookUrl } = req.body ?? {};
  if (!webhookUrl || !/^https?:\/\//.test(String(webhookUrl))) {
    res.status(400).json({ message: 'A valid Slack webhook URL is required.' });
    return;
  }

  await saveSlackWebhook(String(webhookUrl));
  res.json({ message: 'Slack connected successfully.' });
});

apiRouter.get('/slack/status', async (_req, res) => {
  const webhook = await getSlackWebhook();
  res.json({ connected: Boolean(webhook) });
});
