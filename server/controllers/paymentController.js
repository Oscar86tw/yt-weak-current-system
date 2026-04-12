import pool from '../models/db.js';
import { autoMatch } from '../services/matcher.js';
import { createReceipt } from '../services/receiptService.js';
import { updateFinance } from '../services/financeService.js';
import { sendLine } from '../services/lineService.js';
import { logInfo } from '../utils/logger.js';

export async function processPayment(event) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const quote = await autoMatch(client, event.amount, event.orderId);
    if (!quote) {
      await client.query(
        'INSERT INTO audit_log (event, payload) VALUES ($1, $2)',
        ['payment_unmatched', JSON.stringify(event)]
      );
      await client.query(
        'INSERT INTO payments (transaction_id, order_id, amount, status, raw_payload) VALUES ($1,$2,$3,$4,$5)',
        [event.transactionId, event.orderId, event.amount, 'unmatched', JSON.stringify(event)]
      );
      await client.query('COMMIT');
      logInfo('payment unmatched', { orderId: event.orderId, transactionId: event.transactionId });
      return;
    }

    const paymentResult = await client.query(
      'INSERT INTO payments (transaction_id, order_id, amount, status, raw_payload) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [event.transactionId, event.orderId, event.amount, 'matched', JSON.stringify(event)]
    );

    const receipt = await createReceipt(client, quote, event.amount);
    await updateFinance(client, receipt);
    await client.query(
      'INSERT INTO audit_log (event, payload) VALUES ($1, $2)',
      ['payment_processed', JSON.stringify({ payment: paymentResult.rows[0], receipt })]
    );

    await client.query('COMMIT');

    if (quote.line_user_id) {
      await sendLine(
        quote.line_user_id,
        `💰 已收款\n工程：${quote.project_name}\n金額：NT$${event.amount}\n收據：${receipt.receipt_no}`
      );
    }

    logInfo('payment processed', {
      orderId: event.orderId,
      transactionId: event.transactionId,
      receiptNo: receipt.receipt_no
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
