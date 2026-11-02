import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/reachinbox',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  smtpHost: process.env.SMTP_HOST || 'smtp.ethereal.email',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  defaultSender: process.env.DEFAULT_SENDER || 'hello@reachinbox.ai',
  maxEmailsPerHour: Number(process.env.MAX_EMAILS_PER_HOUR || 200),
  minDelayBetweenEmailsMs: Number(process.env.MIN_DELAY_BETWEEN_EMAILS_MS || 2000),
  bullmqConcurrency: Number(process.env.BULLMQ_CONCURRENCY || 3),
  elasticsearchUrl: process.env.ELASTICSEARCH_URL || '',
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/auth/google/callback',
  appName: process.env.APP_NAME || 'ReachInbox',
};
