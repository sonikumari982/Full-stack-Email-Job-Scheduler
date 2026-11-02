import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { initDatabase } from './config/db';
import { apiRouter } from './routes';
import { getTransporter } from './config/mail';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiRouter);

async function startServer(): Promise<void> {
  await initDatabase();
  await getTransporter();

  app.listen(env.port, () => {
    console.log(`ReachInbox backend listening on http://localhost:${env.port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  process.exit(0);
});
