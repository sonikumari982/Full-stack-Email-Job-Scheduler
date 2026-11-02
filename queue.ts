import { Queue, Worker } from 'bullmq';
import { env } from './env';
import { redis } from './redis';
import { processEmailJob } from '../services/emailWorker';

export const emailQueue = new Queue('email-scheduler', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 15000,
    },
  },
});

export const emailWorker = new Worker(
  'email-scheduler',
  async (job) => processEmailJob(job),
  {
    connection: redis,
    concurrency: env.bullmqConcurrency,
  },
);

emailWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id ?? 'unknown'} failed:`, err.message);
});

export async function shutdownQueue(): Promise<void> {
  await emailWorker.close();
  await emailQueue.close();
}
