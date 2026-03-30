const express = require('express');
const app = express();

/*
把這段合併到你現有的 server.js

1. 資料表補充
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS sign_status TEXT DEFAULT '尚未簽核',
  ADD COLUMN IF NOT EXISTS progress TEXT DEFAULT '待安排';

CREATE TABLE IF NOT EXISTS equipment (
  id SERIAL PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  spec TEXT,
  cost INTEGER DEFAULT 0,
  price INTEGER DEFAULT 0,
  profit INTEGER DEFAULT 0,
  note TEXT,
  link TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

2. 文件編號 API
function ymdKey(){
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}

async function nextDocNo(pool, type){
  const map = { quote:'YA', contract:'YB', acceptance:'YC' };
  const prefix = map[type] || 'YA';
  const dateKey = ymdKey();
  const table = type === 'quote' ? 'quotes' : type === 'contract' ? 'contracts' : 'acceptances';
  const column = type === 'quote' ? 'quote_no' : 'doc_no';
  const r = await pool.query(
    `SELECT ${column} AS doc_no FROM ${table} WHERE ${column} LIKE $1 ORDER BY id DESC LIMIT 1`,
    [`${prefix}${dateKey}%`]
  );
  let next = 1;
  if (r.rows.length && r.rows[0].doc_no) {
    next = Number(String(r.rows[0].doc_no).slice(-3)) + 1;
  }
  return `${prefix}${dateKey}${String(next).padStart(3, '0')}`;
}

app.get('/api/serials/next', authRequired, async (req, res) => {
  const doc_no = await nextDocNo(pool, req.query.type || 'quote');
  res.json({ doc_no });
});

3. 報價追蹤 API
app.get('/api/quote-tracking', authRequired, async (req,res) => {
  const r = await pool.query(`
    SELECT q.id,q.quote_no,q.quote_date,q.project_name,q.total,q.sign_status,q.progress,c.client_name
    FROM quotes q
    LEFT JOIN clients c ON c.id=q.client_id
    ORDER BY q.quote_date DESC NULLS LAST,q.id DESC
  `);
  res.json(r.rows);
});

app.put('/api/quote-tracking/:id', authRequired, adminRequired, async (req,res) => {
  const { sign_status, progress } = req.body;
  const r = await pool.query(
    `UPDATE quotes SET sign_status=$1, progress=$2 WHERE id=$3 RETURNING *`,
    [sign_status || '尚未簽核', progress || '待安排', req.params.id]
  );
  res.json(r.rows[0]);
});

4. 設備 API
app.get('/api/equipment', authRequired, async (req,res) => {
  const r = await pool.query(`SELECT * FROM equipment ORDER BY id DESC`);
  res.json(r.rows);
});

app.post('/api/equipment', authRequired, adminRequired, async (req,res) => {
  const { code, name, spec, cost, price, note, link } = req.body;
  const profit = Number(price || 0) - Number(cost || 0);
  const r = await pool.query(
    `INSERT INTO equipment (code,name,spec,cost,price,profit,note,link)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [code || '', name || '', spec || '', Number(cost || 0), Number(price || 0), profit, note || '', link || '']
  );
  res.json(r.rows[0]);
});

app.put('/api/equipment/:id', authRequired, adminRequired, async (req,res) => {
  const { code, name, spec, cost, price, note, link } = req.body;
  const profit = Number(price || 0) - Number(cost || 0);
  const r = await pool.query(
    `UPDATE equipment SET code=$1,name=$2,spec=$3,cost=$4,price=$5,profit=$6,note=$7,link=$8
     WHERE id=$9 RETURNING *`,
    [code || '', name || '', spec || '', Number(cost || 0), Number(price || 0), profit, note || '', link || '', req.params.id]
  );
  res.json(r.rows[0]);
});

app.delete('/api/equipment/:id', authRequired, adminRequired, async (req,res) => {
  await pool.query(`DELETE FROM equipment WHERE id=$1`, [req.params.id]);
  res.json({ ok:true });
});

5. 真正附 PDF 寄信
這一段還需要：
- 郵件服務 API 金鑰
- PDF 產生器
- 可能的檔案暫存或 base64 附件處理
目前不建議假裝已完成。
*/