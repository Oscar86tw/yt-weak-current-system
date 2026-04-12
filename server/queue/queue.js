import { Queue } from 'bullmq';
import connection from '../config/redis.js';

export const paymentQueue = new Queue('payment', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 3000
    },
    removeOnComplete: 100,
    removeOnFail: 1000
  }
});
