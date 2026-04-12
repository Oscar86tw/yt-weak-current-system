import pool from '../models/db.js';

export async function isDuplicateTransaction(transactionId) {
  const result = await pool.query(
    'SELECT id FROM payments WHERE transaction_id = $1 LIMIT 1',
    [transactionId]
  );
  return result.rows.length > 0;
}
