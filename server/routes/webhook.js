import express from 'express';
import { isDuplicateTransaction } from '../utils/idempotency.js';
import { processPayment } from '../controllers/paymentController.js';
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

  await processPayment(event);
  logInfo('webhook processed inline', { transactionId: event.transactionId });

  return res.status(200).json({ ok: true, processed: true });
});

export default router;
