import express from 'express';
import { paymentQueue } from '../queue/queue.js';
import { isDuplicateTransaction } from '../utils/idempotency.js';
import { logInfo } from '../utils/logger.js';

const router = express.Router();

router.post('/linepay', async (req, res) => {
  const event = req.body || {};
  if (!event.transactionId || !event.orderId || !event.amount) {
    return res.status(400).json({ error: 'missing required fields' });
  }

  const duplicate = await isDuplicateTransaction(event.transactionId);
  if (duplicate) {
    return res.status(200).json({ ok: true, duplicate: true });
  }

  await paymentQueue.add('payment-job', event);
  logInfo('webhook accepted', { transactionId: event.transactionId });

  return res.status(200).json({ ok: true, queued: true });
});

export default router;
