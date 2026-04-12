import 'dotenv/config';
import { Worker } from 'bullmq';
import connection from '../config/redis.js';
import { processPayment } from '../controllers/paymentController.js';
import { logError, logInfo } from '../utils/logger.js';

new Worker(
  'payment',
  async (job) => {
    logInfo('worker received job', { id: job.id, name: job.name });
    await processPayment(job.data);
  },
  { connection }
)
  .on('completed', (job) => {
    logInfo('worker completed job', { id: job.id });
  })
  .on('failed', (job, err) => {
    logError('worker failed job', { id: job?.id, error: err.message });
  });

console.log('Worker started');
