import express from 'express';
import pool from '../models/db.js';

const router = express.Router();

router.get('/quotes', async (_req, res) => {
  const result = await pool.query(
    'SELECT id, quote_no, project_name, total, paid, client_name FROM quotes ORDER BY id ASC'
  );
  res.json(result.rows);
});

router.get('/receipts', async (_req, res) => {
  const result = await pool.query(
    `SELECT r.id, r.receipt_no, r.amount_received, r.created_at, q.quote_no, q.project_name
     FROM receipts r
     LEFT JOIN quotes q ON q.id = r.quote_id
     ORDER BY r.id DESC`
  );
  res.json(result.rows);
});

export default router;
