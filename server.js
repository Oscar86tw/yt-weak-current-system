
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');
const multer = require('multer');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
const upload = multer({ storage: multer.memoryStorage() });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const ADMIN_USER = process.env.ADMIN_USER || 'adminoscar';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin0960770512';
const JWT_SECRET = process.env.JWT_SECRET || 'yt-weak-current-jwt-secret';

function hashPwd(s){ return crypto.createHash('sha256').update(String(s)).digest('hex'); }
function todayKey(){ const d=new Date(); return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`; }

async function getSettingsRow(){
  const r = await pool.query(`SELECT * FROM system_settings WHERE id=1`);
  return r.rows[0] || {};
}
async function nextDocNo(type){
  const s = await getSettingsRow();
  const digits = Number(s.serial_digits || 3);
  const dateKey = todayKey();

  if(type === 'equipment_category'){
    const r = await pool.query(`SELECT code FROM equipment_categories ORDER BY id DESC LIMIT 1`);
    let n = 1;
    if(r.rows.length && r.rows[0].code) n = Number(String(r.rows[0].code).replace(/\D/g,'')) + 1;
    return String(n).padStart(4,'0');
  }
  if(type === 'unit'){
    const r = await pool.query(`SELECT code FROM units ORDER BY id DESC LIMIT 1`);
    let n = 1;
    if(r.rows.length && r.rows[0].code) n = Number(String(r.rows[0].code).replace(/\D/g,'')) + 1;
    return String(n).padStart(4,'0');
  }
  if(type === 'equipment'){
    const prefix = s.equipment_prefix || 'EQ';
    const r = await pool.query(`SELECT code FROM equipment WHERE code LIKE $1 ORDER BY id DESC LIMIT 1`, [`${prefix}%`]);
    let n = 1;
    if(r.rows.length && r.rows[0].code) n = Number(String(r.rows[0].code).replace(/\D/g,'')) + 1;
    return `${prefix}${String(n).padStart(4,'0')}`;
  }

  const prefixMap = {
    quote: s.quote_prefix || 'YA',
    contract: s.contract_prefix || 'YB',
    acceptance: s.acceptance_prefix || 'YC',
    purchase: s.purchase_prefix || 'PI',
    receipt: 'YR'
  };
  const tableMap = {
    quote:{table:'quotes',col:'quote_no'},
    contract:{table:'contracts',col:'doc_no'},
    acceptance:{table:'acceptances',col:'doc_no'},
    purchase:{table:'purchases',col:'purchase_no'},
    receipt:{table:'receipts',col:'receipt_no'}
  };
  const prefix = prefixMap[type] || 'YA';
  const target = tableMap[type] || tableMap.quote;
  const r = await pool.query(`SELECT ${target.col} AS doc_no FROM ${target.table} WHERE ${target.col} LIKE $1 ORDER BY id DESC LIMIT 1`, [`${prefix}${dateKey}%`]);
  let next = 1;
  if(r.rows.length && r.rows[0].doc_no) next = Number(String(r.rows[0].doc_no).slice(-digits)) + 1;
  return `${prefix}${dateKey}${String(next).padStart(digits,'0')}`;
}


async function initDb(){
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','viewer')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    client_name TEXT NOT NULL,
    tax_id TEXT,
    contact_person TEXT,
    phone TEXT,
    address TEXT,
    job_title TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    tax_id TEXT,
    contact_person TEXT,
    phone TEXT,
    address TEXT,
    bank_info TEXT,
    note TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS equipment_categories (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS equipment (
    id SERIAL PRIMARY KEY,
    code TEXT,
    category TEXT,
    name TEXT NOT NULL,
    spec TEXT,
    cost INTEGER DEFAULT 0,
    price INTEGER DEFAULT 0,
    profit INTEGER DEFAULT 0,
    note TEXT,
    link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    quote_no TEXT,
    quote_date TEXT,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    project_name TEXT NOT NULL,
    subtotal INTEGER DEFAULT 0,
    tax INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    quote_desc TEXT,
    quote_terms TEXT,
    sign_status TEXT DEFAULT '尚未簽核',
    progress TEXT DEFAULT '待安排',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS quote_items (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
    item_order INTEGER,
    item_desc TEXT,
    spec TEXT,
    equipment_id INTEGER REFERENCES equipment(id) ON DELETE SET NULL,
    qty INTEGER DEFAULT 0,
    unit_price INTEGER DEFAULT 0,
    item_total INTEGER DEFAULT 0
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    doc_no TEXT,
    doc_date TEXT,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    contract_name TEXT,
    scope TEXT,
    frequency TEXT,
    amount INTEGER DEFAULT 0,
    terms TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS approval_note TEXT`);
  await pool.query(`CREATE TABLE IF NOT EXISTS acceptances (
    id SERIAL PRIMARY KEY,
    doc_no TEXT,
    doc_date TEXT,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    content TEXT,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS receipts (
    id SERIAL PRIMARY KEY,
    receipt_no TEXT,
    receipt_date TEXT,
    quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    quote_no TEXT,
    project_name TEXT,
    client_name TEXT,
    receipt_type TEXT DEFAULT '部分收款',
    payment_method TEXT DEFAULT '現金',
    payment_status TEXT DEFAULT '已收訖',
    amount_received INTEGER DEFAULT 0,
    received_total_after INTEGER DEFAULT 0,
    remaining_balance INTEGER DEFAULT 0,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    purchase_no TEXT,
    purchase_date TEXT,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
    site_name TEXT,
    memo TEXT,
    subtotal_amount INTEGER DEFAULT 0,
    tax_amount INTEGER DEFAULT 0,
    total_amount INTEGER DEFAULT 0,
    payment_status TEXT DEFAULT '未付款',
    payment_method TEXT DEFAULT '現金',
    due_date TEXT,
    paid_amount INTEGER DEFAULT 0,
    remaining_amount INTEGER DEFAULT 0,
    paid_date TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    code TEXT,
    name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS purchase_items (
    id SERIAL PRIMARY KEY,
    purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
    item_order INTEGER,
    equipment_id INTEGER REFERENCES equipment(id) ON DELETE SET NULL,
    item_name TEXT,
    spec TEXT,
    qty INTEGER DEFAULT 0,
    unit TEXT,
    unit_cost INTEGER DEFAULT 0,
    item_total INTEGER DEFAULT 0
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    company_name TEXT,
    company_tag TEXT,
    company_phone TEXT,
    company_address TEXT,
    quote_prefix TEXT DEFAULT 'YA',
    contract_prefix TEXT DEFAULT 'YB',
    acceptance_prefix TEXT DEFAULT 'YC',
    purchase_prefix TEXT DEFAULT 'PI',
    equipment_prefix TEXT DEFAULT 'EQ',
    serial_digits INTEGER DEFAULT 3,
    smtp_host TEXT,
    smtp_port TEXT,
    smtp_user TEXT,
    smtp_pass TEXT,
    smtp_secure BOOLEAN DEFAULT FALSE,
    mail_from TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`INSERT INTO system_settings (id, company_name, company_tag, company_phone, company_address, quote_prefix, contract_prefix, acceptance_prefix, purchase_prefix, equipment_prefix, serial_digits)
    VALUES (1,'昱拓弱電有限公司','弱電系統維修｜監控｜門禁｜對講｜車道停管｜BA中央監控','0960-770-512','桃園市中壢區榮安一街490號13樓','YA','YB','YC','PI','EQ',3)
    ON CONFLICT (id) DO NOTHING`);

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
  await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
  await pool.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
  await pool.query(`ALTER TABLE equipment_categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
  await pool.query(`ALTER TABLE equipment ADD COLUMN IF NOT EXISTS category TEXT`);
  await pool.query(`ALTER TABLE equipment ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
  await pool.query(`ALTER TABLE units ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
  await pool.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS sign_status TEXT DEFAULT '尚未簽核'`);
  await pool.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS progress TEXT DEFAULT '待安排'`);
  await pool.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
  await pool.query(`ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS spec TEXT`);
  await pool.query(`ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS equipment_id INTEGER REFERENCES equipment(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
  await pool.query(`ALTER TABLE acceptances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
  await pool.query(`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_quotes_quote_date ON quotes(quote_date)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_quotes_sign_status ON quotes(sign_status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_quotes_progress ON quotes(progress)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_purchases_purchase_date ON purchases(purchase_date)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_purchases_payment_status ON purchases(payment_status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_units_code ON units(code)`);

  const admin = await pool.query(`SELECT id FROM users WHERE username=$1`, [ADMIN_USER]);
  if(!admin.rows.length){
    await pool.query(`INSERT INTO users (username,password_hash,role) VALUES ($1,$2,'admin')`, [ADMIN_USER, hashPwd(ADMIN_PASS)]);
  }
}


function rowsToWorkbook(rows, sheetName){
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type:'buffer', bookType:'xlsx' });
}
function sendExcel(res, filename, rows, sheetName='Sheet1'){
  const buf = rowsToWorkbook(rows, sheetName);
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buf);
}
function parseWorkbook(fileBuffer){
  const wb = XLSX.read(fileBuffer, { type:'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval:'' });
}
function createPdf(res, title, lines){
  const doc = new PDFDocument({ margin: 40 });
  const chunks = [];
  doc.on('data', c => chunks.push(c));
  doc.on('end', () => {
    const buf = Buffer.concat(chunks);
    res.setHeader('Content-Type','application/pdf');
    res.send(buf);
  });
  doc.fontSize(20).text(title);
  doc.moveDown();
  doc.fontSize(12);
  lines.forEach(line => doc.text(String(line)));
  doc.end();
}


function toInt(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toStr(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function pushCondition(conditions, values, sql, value) {
  if (value === undefined || value === null || value === '') return;
  values.push(value);
  conditions.push(sql.replace('?', `$${values.length}`));
}

function buildDateRangeConditions(field, query, conditions, values) {
  if (query.date_from) {
    values.push(query.date_from);
    conditions.push(`${field} >= $${values.length}`);
  }
  if (query.date_to) {
    values.push(query.date_to);
    conditions.push(`${field} <= $${values.length}`);
  }
}



function requireNumericId(req,res,next){
  if(!/^\d+$/.test(String(req.params.id || ''))) return next('route');
  next();
}


function execFileAsync(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 1024 * 1024 * 50, ...opts }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

function authRequired(req,res,next){
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  try{
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  }catch(err){
    return res.status(401).json({ error:'unauthorized' });
  }
}
function adminRequired(req,res,next){
  if(req.user.role !== 'admin') return res.status(403).json({ error:'forbidden' });
  next();
}



app.post('/api/login', async (req,res) => {
  const { username, password } = req.body;
  const r = await pool.query(`SELECT id,username,role,password_hash FROM users WHERE username=$1`, [username || '']);
  if(!r.rows.length) return res.status(401).json({ error:'invalid' });
  const row = r.rows[0];
  if(row.password_hash !== hashPwd(password || '')) return res.status(401).json({ error:'invalid' });
  const token = jwt.sign({ id: row.id, username: row.username, role: row.role }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, username: row.username, role: row.role });
});


app.get('/api/users', authRequired, adminRequired, async (req,res) => res.json((await pool.query(`SELECT id,username,role,created_at FROM users ORDER BY id DESC`)).rows));
app.post('/api/users', authRequired, adminRequired, async (req,res) => {
  const { username, password, role } = req.body;
  const r = await pool.query(`INSERT INTO users (username,password_hash,role) VALUES ($1,$2,$3) RETURNING id,username,role,created_at`, [username, hashPwd(password), role === 'admin' ? 'admin' : 'viewer']);
  res.json(r.rows[0]);
});
app.put('/api/users/:id', authRequired, adminRequired, requireNumericId, async (req,res,next) => {
  const { username, password, role } = req.body;
  let r;
  if(password){
    r = await pool.query(`UPDATE users SET username=$1,password_hash=$2,role=$3 WHERE id=$4 RETURNING id,username,role,created_at`, [username, hashPwd(password), role === 'admin' ? 'admin' : 'viewer', req.params.id]);
  } else {
    r = await pool.query(`UPDATE users SET username=$1,role=$2 WHERE id=$3 RETURNING id,username,role,created_at`, [username, role === 'admin' ? 'admin' : 'viewer', req.params.id]);
  }
  res.json(r.rows[0]);
});

app.get('/api/system-settings', authRequired, async (req,res) => {
  const r = await pool.query(`SELECT * FROM system_settings WHERE id=1`);
  res.json(r.rows[0] || {});
});
app.put('/api/system-settings', authRequired, adminRequired, async (req,res) => {
  const d=req.body;
  const r = await pool.query(`UPDATE system_settings SET company_name=$1,company_tag=$2,company_phone=$3,company_address=$4,quote_prefix=$5,contract_prefix=$6,acceptance_prefix=$7,purchase_prefix=$8,equipment_prefix=$9,serial_digits=$10,smtp_host=$11,smtp_port=$12,smtp_user=$13,smtp_pass=$14,smtp_secure=$15,mail_from=$16,updated_at=CURRENT_TIMESTAMP WHERE id=1 RETURNING *`,
    [d.company_name||'',d.company_tag||'',d.company_phone||'',d.company_address||'',d.quote_prefix||'YA',d.contract_prefix||'YB',d.acceptance_prefix||'YC',d.purchase_prefix||'PI',d.equipment_prefix||'EQ',Number(d.serial_digits||3),d.smtp_host||'',d.smtp_port||'',d.smtp_user||'',d.smtp_pass||'',!!d.smtp_secure,d.mail_from||'']);
  res.json(r.rows[0]);
});

app.get('/api/equipment-categories', authRequired, async (req,res) => res.json((await pool.query(`SELECT * FROM equipment_categories ORDER BY code ASC, id ASC`)).rows));
app.post('/api/equipment-categories', authRequired, adminRequired, async (req,res) => {
  const d=req.body;
  const r=await pool.query(`INSERT INTO equipment_categories (code,name) VALUES ($1,$2) RETURNING *`, [d.code||'', d.name||'']);
  res.json(r.rows[0]);
});
app.put('/api/equipment-categories/:id', authRequired, adminRequired, requireNumericId, async (req,res,next) => {
  const d=req.body;
  const r=await pool.query(`UPDATE equipment_categories SET code=$1,name=$2 WHERE id=$3 RETURNING *`, [d.code||'', d.name||'', req.params.id]);
  res.json(r.rows[0]);
});
app.delete('/api/equipment-categories/:id', authRequired, adminRequired, requireNumericId, async (req,res,next) => {
  await pool.query(`DELETE FROM equipment_categories WHERE id=$1`, [req.params.id]);
  res.json({ ok:true });
});


app.get('/api/units', authRequired, async (req,res) => res.json((await pool.query(`SELECT * FROM units ORDER BY code ASC, id ASC`)).rows));
app.post('/api/units', authRequired, adminRequired, async (req,res) => {
  const d=req.body||{};
  const r=await pool.query(`INSERT INTO units (code,name) VALUES ($1,$2) RETURNING *`, [d.code||'', d.name||'']);
  res.json(r.rows[0]);
});
app.put('/api/units/:id', authRequired, adminRequired, requireNumericId, async (req,res) => {
  const d=req.body||{};
  const r=await pool.query(`UPDATE units SET code=$1,name=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *`, [d.code||'', d.name||'', req.params.id]);
  res.json(r.rows[0]);
});
app.delete('/api/units/:id', authRequired, adminRequired, requireNumericId, async (req,res) => {
  await pool.query(`DELETE FROM units WHERE id=$1`, [req.params.id]);
  res.json({ ok:true });
});

app.get('/api/clients', authRequired, async (req,res) => res.json((await pool.query(`SELECT * FROM clients ORDER BY id DESC`)).rows));
app.post('/api/clients', authRequired, adminRequired, async (req,res) => {
  const d=req.body;
  const r = await pool.query(`INSERT INTO clients (client_name,tax_id,contact_person,phone,address,job_title) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [d.client_name||'', d.tax_id||'', d.contact_person||'', d.phone||'', d.address||'', d.job_title||'']);
  res.json(r.rows[0]);
});
app.put('/api/clients/:id', authRequired, adminRequired, requireNumericId, async (req,res,next) => {
  const d=req.body;
  const r = await pool.query(`UPDATE clients SET client_name=$1,tax_id=$2,contact_person=$3,phone=$4,address=$5,job_title=$6 WHERE id=$7 RETURNING *`, [d.client_name||'', d.tax_id||'', d.contact_person||'', d.phone||'', d.address||'', d.job_title||'', req.params.id]);
  res.json(r.rows[0]);
});
app.delete('/api/clients/:id', authRequired, adminRequired, requireNumericId, async (req,res,next) => { await pool.query(`DELETE FROM clients WHERE id=$1`, [req.params.id]); res.json({ ok:true }); });

app.get('/api/suppliers', authRequired, async (req,res) => res.json((await pool.query(`SELECT * FROM suppliers ORDER BY id DESC`)).rows));
app.post('/api/suppliers', authRequired, adminRequired, async (req,res) => {
  const d=req.body;
  const r = await pool.query(`INSERT INTO suppliers (name,tax_id,contact_person,phone,address,bank_info,note,is_favorite) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [d.name||'', d.tax_id||'', d.contact_person||'', d.phone||'', d.address||'', d.bank_info||'', d.note||'', !!d.is_favorite]);
  res.json(r.rows[0]);
});
app.put('/api/suppliers/:id', authRequired, adminRequired, requireNumericId, async (req,res,next) => {
  const d=req.body;
  const r = await pool.query(`UPDATE suppliers SET name=$1,tax_id=$2,contact_person=$3,phone=$4,address=$5,bank_info=$6,note=$7,is_favorite=$8 WHERE id=$9 RETURNING *`, [d.name||'', d.tax_id||'', d.contact_person||'', d.phone||'', d.address||'', d.bank_info||'', d.note||'', !!d.is_favorite, req.params.id]);
  res.json(r.rows[0]);
});
app.delete('/api/suppliers/:id', authRequired, adminRequired, requireNumericId, async (req,res,next) => { await pool.query(`DELETE FROM suppliers WHERE id=$1`, [req.params.id]); res.json({ ok:true }); });

app.get('/api/equipment', authRequired, async (req,res) => res.json((await pool.query(`SELECT * FROM equipment ORDER BY id DESC`)).rows));
app.post('/api/equipment', authRequired, adminRequired, async (req,res) => {
  const d=req.body; const profit=Number(d.price||0)-Number(d.cost||0);
  const r = await pool.query(`INSERT INTO equipment (code,category,name,spec,cost,price,profit,note,link) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [d.code||'', d.category||'', d.name||'', d.spec||'', Number(d.cost||0), Number(d.price||0), profit, d.note||'', d.link||'']);
  res.json(r.rows[0]);
});
app.put('/api/equipment/:id', authRequired, adminRequired, requireNumericId, async (req,res,next) => {
  const d=req.body; const profit=Number(d.price||0)-Number(d.cost||0);
  const r = await pool.query(`UPDATE equipment SET code=$1,category=$2,name=$3,spec=$4,cost=$5,price=$6,profit=$7,note=$8,link=$9 WHERE id=$10 RETURNING *`, [d.code||'', d.category||'', d.name||'', d.spec||'', Number(d.cost||0), Number(d.price||0), profit, d.note||'', d.link||'', req.params.id]);
  res.json(r.rows[0]);
});
app.delete('/api/equipment/:id', authRequired, adminRequired, requireNumericId, async (req,res,next) => { await pool.query(`DELETE FROM equipment WHERE id=$1`, [req.params.id]); res.json({ ok:true }); });


app.get('/api/quotes/search', authRequired, async (req, res) => {
  try {
    const { keyword = '', date_from = '', date_to = '', client_id = '', sign_status = '', progress = '', total_min = '', total_max = '' } = req.query;
    const conditions = [];
    const values = [];
    if (keyword) {
      values.push(`%${keyword}%`);
      const i = values.length;
      conditions.push(`(q.quote_no ILIKE $${i} OR q.project_name ILIKE $${i} OR COALESCE(c.client_name,'') ILIKE $${i})`);
    }
    buildDateRangeConditions('q.quote_date', { date_from, date_to }, conditions, values);
    pushCondition(conditions, values, 'q.client_id = ?', toInt(client_id));
    pushCondition(conditions, values, 'q.sign_status = ?', sign_status);
    pushCondition(conditions, values, 'q.progress = ?', progress);
    if(total_min!==''){ values.push(toInt(total_min,0)); conditions.push(`q.total >= $${values.length}`); }
    if(total_max!==''){ values.push(toInt(total_max,0)); conditions.push(`q.total <= $${values.length}`); }
    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = (await pool.query(`SELECT q.id,q.quote_no,q.quote_date,q.client_id,c.client_name,q.project_name,q.subtotal,q.tax,q.total,q.sign_status,q.progress,q.created_at,q.updated_at FROM quotes q LEFT JOIN clients c ON c.id=q.client_id ${whereSql} ORDER BY q.quote_date DESC,q.id DESC`, values)).rows;
    res.json({ filters:{ keyword, date_from, date_to, client_id, sign_status, progress, total_min, total_max }, rows });
  } catch (err) { console.error('quotes search error:', err); res.status(500).json({ error:'quotes_search_failed' }); }
});

app.get('/api/quotes/summary', authRequired, async (req, res) => {
  try {
    const row = (await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE quote_date = CURRENT_DATE::TEXT) AS today_count,
        COUNT(*) FILTER (
          WHERE quote_date ~ '^\d{4}-\d{2}-\d{2}$'
            AND DATE_TRUNC('month', CAST(quote_date AS DATE)) = DATE_TRUNC('month', CURRENT_DATE)
        ) AS month_count,
        COALESCE(SUM(total) FILTER (
          WHERE quote_date ~ '^\d{4}-\d{2}-\d{2}$'
            AND DATE_TRUNC('month', CAST(quote_date AS DATE)) = DATE_TRUNC('month', CURRENT_DATE)
        ),0) AS month_total,
        COALESCE(SUM(total) FILTER (
          WHERE sign_status='同意施作'
            AND quote_date ~ '^\d{4}-\d{2}-\d{2}$'
            AND DATE_TRUNC('month', CAST(quote_date AS DATE)) = DATE_TRUNC('month', CURRENT_DATE)
        ),0) AS approved_total,
        COUNT(*) FILTER (WHERE sign_status='尚未簽核') AS unsigned_count,
        COUNT(*) FILTER (WHERE progress='待安排') AS pending_count
      FROM quotes
    `)).rows[0] || {};
    res.json({
      today_count: Number(row.today_count || 0),
      month_count: Number(row.month_count || 0),
      month_total: Number(row.month_total || 0),
      approved_total: Number(row.approved_total || 0),
      unsigned_count: Number(row.unsigned_count || 0),
      pending_count: Number(row.pending_count || 0)
    });
  } catch (err) {
    console.error('quotes summary error:', err);
    res.json({ today_count: 0, month_count: 0, month_total: 0, approved_total: 0, unsigned_count: 0, pending_count: 0, warning: 'quotes_summary_failed' });
  }
});

app.get('/api/purchases/search', authRequired, async (req, res) => {
  try {
    const { keyword = '', date_from = '', date_to = '', supplier_id = '', payment_status = '', payment_method = '', total_min = '', total_max = '' } = req.query;
    const conditions = [];
    const values = [];
    if (keyword) {
      values.push(`%${keyword}%`);
      const i = values.length;
      conditions.push(`(p.purchase_no ILIKE $${i} OR COALESCE(s.name,'') ILIKE $${i} OR COALESCE(p.site_name,'') ILIKE $${i} OR COALESCE(q.quote_no,'') ILIKE $${i})`);
    }
    buildDateRangeConditions('p.purchase_date', { date_from, date_to }, conditions, values);
    pushCondition(conditions, values, 'p.supplier_id = ?', toInt(supplier_id));
    pushCondition(conditions, values, 'p.payment_status = ?', payment_status);
    pushCondition(conditions, values, 'p.payment_method = ?', payment_method);
    if(total_min!==''){ values.push(toInt(total_min,0)); conditions.push(`p.total_amount >= $${values.length}`); }
    if(total_max!==''){ values.push(toInt(total_max,0)); conditions.push(`p.total_amount <= $${values.length}`); }
    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = (await pool.query(`SELECT p.id,p.purchase_no,p.purchase_date,p.supplier_id,s.name AS supplier_name,p.quote_id,q.quote_no,p.site_name,p.total_amount,p.paid_amount,p.remaining_amount,p.payment_status,p.payment_method,p.due_date,p.paid_date,p.created_at,p.updated_at FROM purchases p LEFT JOIN suppliers s ON s.id=p.supplier_id LEFT JOIN quotes q ON q.id=p.quote_id ${whereSql} ORDER BY p.purchase_date DESC,p.id DESC`, values)).rows;
    res.json({ filters:{ keyword,date_from,date_to,supplier_id,payment_status,payment_method,total_min,total_max }, rows });
  } catch (err) { console.error('purchases search error:', err); res.status(500).json({ error:'purchases_search_failed' }); }
});

app.get('/api/purchases/summary', authRequired, async (req, res) => {
  try {
    const row = (await pool.query(`
      SELECT
        COUNT(*) FILTER (
          WHERE purchase_date ~ '^\d{4}-\d{2}-\d{2}$'
            AND DATE_TRUNC('month', CAST(purchase_date AS DATE)) = DATE_TRUNC('month', CURRENT_DATE)
        ) AS month_count,
        COALESCE(SUM(total_amount) FILTER (
          WHERE purchase_date ~ '^\d{4}-\d{2}-\d{2}$'
            AND DATE_TRUNC('month', CAST(purchase_date AS DATE)) = DATE_TRUNC('month', CURRENT_DATE)
        ),0) AS month_total,
        COALESCE(SUM(paid_amount),0) AS paid_total,
        COALESCE(SUM(remaining_amount),0) AS unpaid_total,
        COUNT(*) FILTER (WHERE COALESCE(payment_status,'') <> '已付款') AS unpaid_count
      FROM purchases
    `)).rows[0] || {};
    res.json({
      month_count: Number(row.month_count || 0),
      month_total: Number(row.month_total || 0),
      paid_total: Number(row.paid_total || 0),
      unpaid_total: Number(row.unpaid_total || 0),
      unpaid_count: Number(row.unpaid_count || 0)
    });
  } catch (err) {
    console.error('purchases summary error:', err);
    res.json({ month_count: 0, month_total: 0, paid_total: 0, unpaid_total: 0, unpaid_count: 0, warning: 'purchases_summary_failed' });
  }
});


app.get('/api/purchases/overdue', authRequired, async (req, res) => {
  try {
    const rows = (await pool.query(`
      SELECT
        p.id,p.purchase_no,p.purchase_date,s.name AS supplier_name,
        p.total_amount,p.paid_amount,p.remaining_amount,p.due_date,p.payment_status
      FROM purchases p
      LEFT JOIN suppliers s ON s.id=p.supplier_id
      WHERE COALESCE(p.payment_status,'') <> '已付款'
        AND p.due_date ~ '^\d{4}-\d{2}-\d{2}$'
        AND CAST(p.due_date AS DATE) < CURRENT_DATE
      ORDER BY p.due_date ASC
    `)).rows;
    res.json({ rows });
  } catch (err) {
    console.error('purchases overdue error:', err);
    res.json({ rows: [], warning: 'purchases_overdue_failed' });
  }
});

app.get('/api/equipment/search', authRequired, async (req, res) => {
  try {
    const { keyword = '', category = '', date_from = '', date_to = '', cost_min = '', cost_max = '', price_min = '', price_max = '', profit_min = '', profit_max = '' } = req.query;
    const conditions = [];
    const values = [];
    if (keyword) {
      values.push(`%${keyword}%`);
      const i = values.length;
      conditions.push(`(e.code ILIKE $${i} OR COALESCE(e.category,'') ILIKE $${i} OR COALESCE(e.name,'') ILIKE $${i} OR COALESCE(e.spec,'') ILIKE $${i} OR COALESCE(e.note,'') ILIKE $${i})`);
    }
    pushCondition(conditions, values, 'e.category = ?', category);
    if(date_from){ values.push(date_from); conditions.push(`e.created_at::DATE >= $${values.length}::DATE`); }
    if(date_to){ values.push(date_to); conditions.push(`e.created_at::DATE <= $${values.length}::DATE`); }
    [['e.cost >= ?', toInt(cost_min)], ['e.cost <= ?', toInt(cost_max)], ['e.price >= ?', toInt(price_min)], ['e.price <= ?', toInt(price_max)], ['e.profit >= ?', toInt(profit_min)], ['e.profit <= ?', toInt(profit_max)]].forEach(([sql,v])=>pushCondition(conditions, values, sql, v));
    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = (await pool.query(`SELECT e.id,e.code,e.category,e.name,e.spec,e.cost,e.price,e.profit,e.note,e.link,e.created_at,e.updated_at FROM equipment e ${whereSql} ORDER BY e.created_at DESC,e.id DESC`, values)).rows;
    res.json({ filters:{ keyword,category,date_from,date_to,cost_min,cost_max,price_min,price_max,profit_min,profit_max }, rows });
  } catch (err) { console.error('equipment search error:', err); res.status(500).json({ error:'equipment_search_failed' }); }
});
app.get('/api/equipment/summary', authRequired, async (req, res) => {
  try {
    const row = (await pool.query(`SELECT COUNT(*) AS total_count, COUNT(*) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)) AS new_this_month, COALESCE(AVG(price),0) AS avg_price, COALESCE(AVG(profit),0) AS avg_profit, COUNT(*) FILTER (WHERE profit >= 1000) AS high_profit_count FROM equipment`)).rows[0] || {};
    res.json({ total_count:Number(row.total_count||0), new_this_month:Number(row.new_this_month||0), avg_price:Number(row.avg_price||0), avg_profit:Number(row.avg_profit||0), high_profit_count:Number(row.high_profit_count||0) });
  } catch (err) { console.error('equipment summary error:', err); res.status(500).json({ error:'equipment_summary_failed' }); }
});

app.get('/api/serials/next', authRequired, async (req,res) => res.json({ doc_no: await nextDocNo(req.query.type || 'quote') }));

app.get('/api/quotes', authRequired, async (req,res) => res.json((await pool.query(`SELECT * FROM quotes ORDER BY id DESC`)).rows));
app.get('/api/quotes/:id', authRequired, requireNumericId, async (req,res,next) => {
  const q = await pool.query(`SELECT * FROM quotes WHERE id=$1`, [req.params.id]);
  if(!q.rows.length) return res.status(404).json({ error:'not found' });
  const items = await pool.query(`SELECT * FROM quote_items WHERE quote_id=$1 ORDER BY item_order ASC,id ASC`, [req.params.id]);
  res.json({ ...q.rows[0], items: items.rows });
});
async function saveQuote(id, body){
  const items = body.items || [];
  const subtotal = items.reduce((s,i)=>s + (Number(i.qty||0)*Number(i.unit_price||0)), 0);
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;
  let q;
  if(id){
    const r = await pool.query(`UPDATE quotes SET quote_no=$1,quote_date=$2,client_id=$3,project_name=$4,subtotal=$5,tax=$6,total=$7,quote_desc=$8,quote_terms=$9 WHERE id=$10 RETURNING *`, [body.quote_no||'', body.quote_date||'', body.client_id||null, body.project_name||'', subtotal, tax, total, body.quote_desc||'', body.quote_terms||'', id]);
    q = r.rows[0];
    await pool.query(`DELETE FROM quote_items WHERE quote_id=$1`, [id]);
  } else {
    const r = await pool.query(`INSERT INTO quotes (quote_no,quote_date,client_id,project_name,subtotal,tax,total,quote_desc,quote_terms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [body.quote_no||'', body.quote_date||'', body.client_id||null, body.project_name||'', subtotal, tax, total, body.quote_desc||'', body.quote_terms||'']);
    q = r.rows[0];
  }
  for(const item of items){
    const qty=Number(item.qty||0), unitPrice=Number(item.unit_price||0), itemTotal=qty*unitPrice;
    await pool.query(`INSERT INTO quote_items (quote_id,item_order,item_desc,spec,equipment_id,qty,unit_price,item_total) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [q.id, item.item_order||0, item.item_desc||'', item.spec||'', item.equipment_id||null, qty, unitPrice, itemTotal]);
  }
  return q;
}
app.post('/api/quotes', authRequired, adminRequired, async (req,res) => { const q = await saveQuote(null, req.body); res.json({ ok:true, id:q.id }); });
app.put('/api/quotes/:id', authRequired, adminRequired, requireNumericId, async (req,res,next) => { const q = await saveQuote(req.params.id, req.body); res.json({ ok:true, id:q.id }); });
app.delete('/api/quotes/:id', authRequired, adminRequired, requireNumericId, async (req,res,next) => { await pool.query(`DELETE FROM quotes WHERE id=$1`, [req.params.id]); res.json({ ok:true }); });

app.get('/api/quote-tracking', authRequired, async (req,res) => res.json((await pool.query(`SELECT * FROM quotes ORDER BY id DESC`)).rows));
app.put('/api/quote-tracking/:id', authRequired, adminRequired, requireNumericId, async (req,res,next) => {
  const d=req.body;
  const r = await pool.query(`UPDATE quotes SET sign_status=$1,progress=$2 WHERE id=$3 RETURNING *`, [d.sign_status||'尚未簽核', d.progress||'待安排', req.params.id]);
  res.json(r.rows[0]);
});

app.get('/api/contracts', authRequired, async (req,res) => {
  const rows = (await pool.query(`
    SELECT ct.*, q.quote_no, q.project_name, c.client_name
    FROM contracts ct
    LEFT JOIN quotes q ON q.id = ct.quote_id
    LEFT JOIN clients c ON c.id = ct.client_id
    ORDER BY ct.id DESC
  `)).rows;
  res.json(rows);
});
app.get('/api/contracts/:id', authRequired, requireNumericId, async (req,res,next) => {
  const r=await pool.query(`
    SELECT ct.*, q.quote_no, q.project_name, c.client_name
    FROM contracts ct
    LEFT JOIN quotes q ON q.id = ct.quote_id
    LEFT JOIN clients c ON c.id = ct.client_id
    WHERE ct.id=$1
  `, [req.params.id]);
  if(!r.rows.length) return res.status(404).json({error:'not found'});
  res.json(r.rows[0]);
});
app.post('/api/contracts', authRequired, adminRequired, async (req,res) => {
  const d=req.body;
  const r=await pool.query(`INSERT INTO contracts (doc_no,doc_date,client_id,quote_id,contract_name,scope,frequency,amount,terms,approval_note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [d.doc_no||'', d.doc_date||'', d.client_id||null, d.quote_id||null, d.contract_name||'', d.scope||'', d.frequency||'', Number(d.amount||0), d.terms||'', d.approval_note||'']);
  res.json(r.rows[0]);
});
app.put('/api/contracts/:id', authRequired, adminRequired, requireNumericId, async (req,res,next) => {
  const d=req.body;
  const r=await pool.query(`UPDATE contracts SET doc_no=$1,doc_date=$2,client_id=$3,quote_id=$4,contract_name=$5,scope=$6,frequency=$7,amount=$8,terms=$9,approval_note=$10 WHERE id=$11 RETURNING *`,
    [d.doc_no||'', d.doc_date||'', d.client_id||null, d.quote_id||null, d.contract_name||'', d.scope||'', d.frequency||'', Number(d.amount||0), d.terms||'', d.approval_note||'', req.params.id]);
  res.json(r.rows[0]);
});
app.delete('/api/contracts/:id', authRequired, adminRequired, requireNumericId, async (req,res,next) => { await pool.query(`DELETE FROM contracts WHERE id=$1`, [req.params.id]); res.json({ ok:true }); });

app.get('/api/acceptances', authRequired, async (req,res) => res.json((await pool.query(`SELECT * FROM acceptances ORDER BY id DESC`)).rows));
app.get('/api/acceptances/:id', authRequired, requireNumericId, async (req,res,next) => { const r=await pool.query(`SELECT * FROM acceptances WHERE id=$1`, [req.params.id]); if(!r.rows.length) return res.status(404).json({error:'not found'}); res.json(r.rows[0]); });
app.post('/api/acceptances', authRequired, adminRequired, async (req,res) => {
  const d=req.body;
  const r=await pool.query(`INSERT INTO acceptances (doc_no,doc_date,client_id,content,note) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [d.doc_no||'', d.doc_date||'', d.client_id||null, d.content||'', d.note||'']);
  res.json(r.rows[0]);
});
app.put('/api/acceptances/:id', authRequired, adminRequired, requireNumericId, async (req,res,next) => {
  const d=req.body;
  const r=await pool.query(`UPDATE acceptances SET doc_no=$1,doc_date=$2,client_id=$3,content=$4,note=$5 WHERE id=$6 RETURNING *`, [d.doc_no||'', d.doc_date||'', d.client_id||null, d.content||'', d.note||'', req.params.id]);
  res.json(r.rows[0]);
});
app.delete('/api/acceptances/:id', authRequired, adminRequired, requireNumericId, async (req,res,next) => { await pool.query(`DELETE FROM acceptances WHERE id=$1`, [req.params.id]); res.json({ ok:true }); });

app.get('/api/purchases', authRequired, async (req,res) => {
  const r = await pool.query(`SELECT p.*, s.name AS supplier_name, q.quote_no FROM purchases p LEFT JOIN suppliers s ON s.id=p.supplier_id LEFT JOIN quotes q ON q.id=p.quote_id ORDER BY p.id DESC`);
  res.json(r.rows);
});
app.get('/api/purchases/:id', authRequired, requireNumericId, async (req,res,next) => {
  const p = await pool.query(`SELECT * FROM purchases WHERE id=$1`, [req.params.id]);
  if(!p.rows.length) return res.status(404).json({ error:'not found' });
  const items = await pool.query(`SELECT * FROM purchase_items WHERE purchase_id=$1 ORDER BY item_order ASC,id ASC`, [req.params.id]);
  res.json({ ...p.rows[0], items: items.rows });
});
async function savePurchase(id, body){
  const items = body.items || [];
  const subtotal = items.reduce((s,i)=>s + (Number(i.qty||0)*Number(i.unit_cost||0)), 0);
  const tax = Number(body.tax_amount || 0);
  const total = subtotal + tax;
  const paid = Number(body.paid_amount || 0);
  const remain = total - paid;
  let p;
  if(id){
    const r = await pool.query(`UPDATE purchases SET purchase_no=$1,purchase_date=$2,supplier_id=$3,quote_id=$4,site_name=$5,memo=$6,subtotal_amount=$7,tax_amount=$8,total_amount=$9,payment_status=$10,payment_method=$11,due_date=$12,paid_amount=$13,remaining_amount=$14,paid_date=$15 WHERE id=$16 RETURNING *`,
      [body.purchase_no||'', body.purchase_date||'', body.supplier_id||null, body.quote_id||null, body.site_name||'', body.memo||'', subtotal, tax, total, body.payment_status||'未付款', body.payment_method||'現金', body.due_date||'', paid, remain, body.paid_date||'', id]);
    p = r.rows[0];
    await pool.query(`DELETE FROM purchase_items WHERE purchase_id=$1`, [id]);
  } else {
    const r = await pool.query(`INSERT INTO purchases (purchase_no,purchase_date,supplier_id,quote_id,site_name,memo,subtotal_amount,tax_amount,total_amount,payment_status,payment_method,due_date,paid_amount,remaining_amount,paid_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [body.purchase_no||'', body.purchase_date||'', body.supplier_id||null, body.quote_id||null, body.site_name||'', body.memo||'', subtotal, tax, total, body.payment_status||'未付款', body.payment_method||'現金', body.due_date||'', paid, remain, body.paid_date||'']);
    p = r.rows[0];
  }
  for(const item of items){
    const qty=Number(item.qty||0), unitCost=Number(item.unit_cost||0), itemTotal=qty*unitCost;
    await pool.query(`INSERT INTO purchase_items (purchase_id,item_order,equipment_id,item_name,spec,qty,unit,unit_cost,item_total) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [p.id, item.item_order||0, item.equipment_id||null, item.item_name||'', item.spec||'', qty, item.unit||'', unitCost, itemTotal]);
  }
  return p;
}
app.post('/api/purchases', authRequired, adminRequired, async (req,res) => { const p = await savePurchase(null, req.body); res.json({ ok:true, id:p.id }); });
app.put('/api/purchases/:id', authRequired, adminRequired, requireNumericId, async (req,res,next) => { const p = await savePurchase(req.params.id, req.body); res.json({ ok:true, id:p.id }); });
app.delete('/api/purchases/:id', authRequired, adminRequired, requireNumericId, async (req,res,next) => { await pool.query(`DELETE FROM purchases WHERE id=$1`, [req.params.id]); res.json({ ok:true }); });
app.get('/api/payables', authRequired, async (req,res) => {
  const r = await pool.query(`SELECT p.id,p.purchase_no,p.payment_status,p.payment_method,p.due_date,p.paid_date,p.total_amount,p.paid_amount,p.remaining_amount,s.name AS supplier_name,p.created_at FROM purchases p LEFT JOIN suppliers s ON s.id=p.supplier_id ORDER BY COALESCE(p.due_date,''), p.id DESC`);
  res.json(r.rows);
});


app.post('/api/import/receipts', authRequired, adminRequired, upload.single('file'), async (req,res) => {
  const rows = parseWorkbook(req.file.buffer); let imported=0;
  for(const r of rows){
    if(!r['收據編號']) continue;
    await pool.query(`INSERT INTO receipts (receipt_no,receipt_date,quote_no,project_name,client_name,receipt_type,payment_method,payment_status,amount_received,received_total_after,remaining_balance,note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [
      r['收據編號']||'', r['收據日期']||'', r['報價單號']||'', r['工程名稱']||'', r['客戶名稱']||'', r['收款類型']||'部分收款',
      r['收款方式']||'現金', r['款項狀態']||'已收訖', Number(r['本次收款']||0), Number(r['累計已收']||0), Number(r['剩餘未收']||0), r['備註']||''
    ]);
    imported++;
  }
  res.json({ imported });
});

app.get('/api/analysis/:type', authRequired, async (req,res) => {
  const type = req.params.type;
  let query = '', totalField = undefined;
  if(type === 'suppliers'){
    query = `SELECT * FROM suppliers WHERE DATE(created_at)=CURRENT_DATE ORDER BY created_at DESC`;
  } else if(type === 'equipment'){
    query = `SELECT * FROM equipment WHERE DATE(created_at)=CURRENT_DATE ORDER BY created_at DESC`;
  } else if(type === 'purchases'){
    query = `SELECT p.*, s.name AS supplier_name FROM purchases p LEFT JOIN suppliers s ON s.id=p.supplier_id WHERE DATE(p.created_at)=CURRENT_DATE ORDER BY p.created_at DESC`;
    totalField = 'total_amount';
  } else if(type === 'quotes'){
    query = `SELECT * FROM quotes WHERE DATE(created_at)=CURRENT_DATE ORDER BY created_at DESC`;
    totalField = 'total';
  } else if(type === 'contracts'){
    query = `SELECT * FROM contracts WHERE DATE(created_at)=CURRENT_DATE ORDER BY created_at DESC`;
    totalField = 'amount';
  } else if(type === 'acceptances'){
    query = `SELECT * FROM acceptances WHERE DATE(created_at)=CURRENT_DATE ORDER BY created_at DESC`;
  } else {
    return res.status(400).json({ error:'unknown type' });
  }
  const rows = (await pool.query(query)).rows;
  let total_amount = undefined;
  if(totalField) total_amount = rows.reduce((s,r)=>s + Number(r[totalField] || 0), 0);
  res.json({ count: rows.length, total_amount, rows });
});












app.get('/api/clients/:id/history', authRequired, async (req,res) => {
  const id = toInt(req.params.id, 0);
  if(!id) return res.status(400).json({ error:'invalid_id' });
  const rows = [];
  const q = await pool.query(`SELECT '報價單' AS doc_type, quote_no AS doc_no, quote_date AS doc_date, total AS total_amount FROM quotes WHERE client_id=$1`, [id]);
  const c = await pool.query(`SELECT '維護合約單' AS doc_type, doc_no, doc_date, amount AS total_amount FROM contracts WHERE client_id=$1`, [id]);
  const a = await pool.query(`SELECT '驗收單' AS doc_type, doc_no, doc_date, 0 AS total_amount FROM acceptances WHERE client_id=$1`, [id]);
  rows.push(...q.rows, ...c.rows, ...a.rows);
  rows.sort((x,y)=>String(y.doc_date||'').localeCompare(String(x.doc_date||'')));
  const total_amount = rows.reduce((s,r)=>s + Number(r.total_amount||0), 0);
  res.json({ count: rows.length, total_amount, rows });
});


app.get('/api/dashboard/top-clients', authRequired, async (req, res) => {
  try {
    const rows = (await pool.query(`
      SELECT COALESCE(c.client_name,'未指定客戶') AS client_name,
             COUNT(q.id)::int AS quote_count,
             COALESCE(SUM(q.total),0) AS total_amount,
             MAX(q.quote_date) AS last_date
      FROM quotes q
      LEFT JOIN clients c ON c.id=q.client_id
      GROUP BY COALESCE(c.client_name,'未指定客戶')
      ORDER BY total_amount DESC
      LIMIT 10
    `)).rows;
    res.json({ rows });
  } catch (err) {
    console.error('dashboard top clients error:', err);
    res.json({ rows: [], warning: 'top_clients_failed' });
  }
});

app.get('/api/dashboard/top-suppliers', authRequired, async (req, res) => {
  try {
    const rows = (await pool.query(`
      SELECT COALESCE(s.name,'未指定供應商') AS supplier_name,
             COUNT(p.id)::int AS purchase_count,
             COALESCE(SUM(p.total_amount),0) AS total_amount,
             COALESCE(SUM(p.remaining_amount),0) AS unpaid_amount,
             MAX(p.purchase_date) AS last_date
      FROM purchases p
      LEFT JOIN suppliers s ON s.id=p.supplier_id
      GROUP BY COALESCE(s.name,'未指定供應商')
      ORDER BY total_amount DESC
      LIMIT 10
    `)).rows;
    res.json({ rows });
  } catch (err) {
    console.error('dashboard top suppliers error:', err);
    res.json({ rows: [], warning: 'top_suppliers_failed' });
  }
});

app.get('/api/dashboard/equipment-profit-rank', authRequired, async (req, res) => {
  try {
    const rows = (await pool.query(`
      SELECT COALESCE(category,'未分類') AS category,
             COALESCE(name,'未命名設備') AS name,
             COALESCE(spec,'') AS spec,
             COALESCE(cost,0) AS cost,
             COALESCE(price,0) AS price,
             COALESCE(profit,0) AS profit
      FROM equipment
      ORDER BY COALESCE(profit,0) DESC, COALESCE(price,0) DESC
      LIMIT 10
    `)).rows;
    res.json({ rows });
  } catch (err) {
    console.error('equipment profit rank error:', err);
    res.json({ rows: [], warning: 'equipment_profit_rank_failed' });
  }
});

app.get('/api/dashboard/project-profit', authRequired, async (req, res) => {
  try {
    const rows = (await pool.query(`
      SELECT 
        q.id,
        q.quote_no,
        q.quote_date,
        COALESCE(c.client_name,'未指定客戶') AS client_name,
        COALESCE(q.project_name,'未命名工程') AS project_name,
        COALESCE(q.total,0) AS quote_total,
        COALESCE(SUM(p.total_amount),0) AS purchase_total,
        COALESCE(q.total,0) - COALESCE(SUM(p.total_amount),0) AS gross_profit,
        CASE
          WHEN COALESCE(q.total,0) > 0 
          THEN ROUND(((COALESCE(q.total,0) - COALESCE(SUM(p.total_amount),0)) / q.total::numeric) * 100, 2)
          ELSE 0
        END AS gross_margin
      FROM quotes q
      LEFT JOIN clients c ON c.id=q.client_id
      LEFT JOIN purchases p ON p.quote_id=q.id
      GROUP BY q.id, q.quote_no, q.quote_date, c.client_name, q.project_name, q.total
      ORDER BY q.quote_date DESC, q.id DESC
      LIMIT 100
    `)).rows;
    res.json({ rows });
  } catch (err) {
    console.error('project profit error:', err);
    res.json({ rows: [], warning: 'project_profit_failed' });
  }
});

app.get('/api/dashboard/project-profit-summary', authRequired, async (req, res) => {
  try {
    const row = (await pool.query(`
      WITH x AS (
        SELECT 
          q.id,
          COALESCE(q.total,0) AS quote_total,
          COALESCE(SUM(p.total_amount),0) AS purchase_total,
          COALESCE(q.total,0) - COALESCE(SUM(p.total_amount),0) AS gross_profit
        FROM quotes q
        LEFT JOIN purchases p ON p.quote_id=q.id
        GROUP BY q.id, q.total
      )
      SELECT
        COUNT(*)::int AS project_count,
        COALESCE(SUM(quote_total),0) AS total_quote_amount,
        COALESCE(SUM(purchase_total),0) AS total_purchase_amount,
        COALESCE(SUM(gross_profit),0) AS total_gross_profit,
        COUNT(*) FILTER (WHERE gross_profit < 0)::int AS loss_count,
        COUNT(*) FILTER (WHERE gross_profit >= 0 AND gross_profit < 1000)::int AS low_profit_count
      FROM x
    `)).rows[0] || {};
    res.json({
      project_count: Number(row.project_count || 0),
      total_quote_amount: Number(row.total_quote_amount || 0),
      total_purchase_amount: Number(row.total_purchase_amount || 0),
      total_gross_profit: Number(row.total_gross_profit || 0),
      loss_count: Number(row.loss_count || 0),
      low_profit_count: Number(row.low_profit_count || 0)
    });
  } catch (err) {
    console.error('project profit summary error:', err);
    res.json({ project_count:0,total_quote_amount:0,total_purchase_amount:0,total_gross_profit:0,loss_count:0,low_profit_count:0, warning:'project_profit_summary_failed' });
  }
});


app.get('/api/projects/workspace', authRequired, async (req, res) => {
  try {
    const keyword = String(req.query.keyword || '').trim();
    const signStatus = String(req.query.sign_status || '').trim();
    const progress = String(req.query.progress || '').trim();
    const clientId = String(req.query.client_id || '').trim();
    const params = [];
    let where = [];
    if (keyword) {
      params.push(`%${keyword}%`);
      const idx = params.length;
      where.push(`(q.quote_no ILIKE $${idx} OR q.project_name ILIKE $${idx} OR COALESCE(c.client_name,'') ILIKE $${idx})`);
    }
    if (signStatus) {
      params.push(signStatus);
      where.push(`COALESCE(q.sign_status,'') = $${params.length}`);
    }
    if (progress) {
      params.push(progress);
      where.push(`COALESCE(q.progress,'') = $${params.length}`);
    }
    if (clientId && /^\d+$/.test(clientId)) {
      params.push(Number(clientId));
      where.push(`q.client_id = $${params.length}`);
    }
    const sql = `
      SELECT
        q.id,
        q.quote_no,
        q.quote_date,
        q.client_id,
        COALESCE(c.client_name,'未指定客戶') AS client_name,
        COALESCE(q.project_name,'未命名工程') AS project_name,
        COALESCE(q.total,0) AS quote_total,
        COALESCE(q.sign_status,'尚未簽核') AS sign_status,
        COALESCE(q.progress,'待安排') AS progress,
        COALESCE(COUNT(p.id),0)::int AS purchase_count,
        COALESCE(SUM(p.total_amount),0) AS purchase_total,
        COALESCE(q.total,0) - COALESCE(SUM(p.total_amount),0) AS gross_profit,
        CASE
          WHEN COALESCE(q.total,0) > 0
          THEN ROUND(((COALESCE(q.total,0) - COALESCE(SUM(p.total_amount),0)) / q.total::numeric) * 100, 2)
          ELSE 0
        END AS gross_margin,
        MAX(p.purchase_date) AS last_purchase_date
      FROM quotes q
      LEFT JOIN clients c ON c.id = q.client_id
      LEFT JOIN purchases p ON p.quote_id = q.id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      GROUP BY q.id, q.quote_no, q.quote_date, q.client_id, c.client_name, q.project_name, q.total, q.sign_status, q.progress
      ORDER BY q.quote_date DESC, q.id DESC
      LIMIT 200
    `;
    const rows = (await pool.query(sql, params)).rows;
    res.json({ rows });
  } catch (err) {
    console.error('projects workspace error:', err);
    res.json({ rows: [], warning: 'projects_workspace_failed' });
  }
});

app.put('/api/projects/:id/workspace-status', authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ error: 'invalid_id' });
    const signStatus = String(req.body?.sign_status || '').trim() || '尚未簽核';
    const progress = String(req.body?.progress || '').trim() || '待安排';
    const row = (await pool.query(
      `UPDATE quotes SET sign_status=$1, progress=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING id, sign_status, progress`,
      [signStatus, progress, id]
    )).rows[0];
    if (!row) return res.status(404).json({ error: 'not_found' });
    res.json(row);
  } catch (err) {
    console.error('projects workspace status error:', err);
    res.status(500).json({ error: 'projects_workspace_status_failed', detail: err.message });
  }
});

app.get('/api/projects/:id/detail', authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ error: 'invalid_id' });
    const quote = (await pool.query(`
      SELECT q.*, COALESCE(c.client_name,'未指定客戶') AS client_name
      FROM quotes q
      LEFT JOIN clients c ON c.id = q.client_id
      WHERE q.id=$1
    `, [id])).rows[0];
    if (!quote) return res.status(404).json({ error: 'not_found' });
    const purchases = (await pool.query(`
      SELECT p.id, p.purchase_no, p.purchase_date, COALESCE(s.name,'未指定供應商') AS supplier_name,
             COALESCE(p.total_amount,0) AS total_amount, COALESCE(p.paid_amount,0) AS paid_amount,
             COALESCE(p.remaining_amount,0) AS remaining_amount, COALESCE(p.payment_status,'未付款') AS payment_status
      FROM purchases p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.quote_id=$1
      ORDER BY p.purchase_date DESC, p.id DESC
    `, [id])).rows;
    const quoteItems = (await pool.query(`
      SELECT item_order, item_desc, spec, qty, unit_price, item_total
      FROM quote_items
      WHERE quote_id=$1
      ORDER BY item_order ASC, id ASC
    `, [id])).rows;
    res.json({ quote, purchases, quote_items: quoteItems });
  } catch (err) {
    console.error('project detail error:', err);
    res.status(500).json({ error: 'project_detail_failed', detail: err.message });
  }
});


app.get('/api/projects/:id/lifecycle', authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ error: 'invalid_id' });

    const quote = (await pool.query(`
      SELECT q.*, COALESCE(c.client_name,'未指定客戶') AS client_name
      FROM quotes q
      LEFT JOIN clients c ON c.id=q.client_id
      WHERE q.id=$1
    `,[id])).rows[0];
    if (!quote) return res.status(404).json({ error: 'not_found' });

    const purchases = (await pool.query(`
      SELECT p.id, p.purchase_no, p.purchase_date, COALESCE(s.name,'未指定供應商') AS supplier_name,
             COALESCE(p.total_amount,0) AS total_amount, COALESCE(p.paid_amount,0) AS paid_amount,
             COALESCE(p.remaining_amount,0) AS remaining_amount, COALESCE(p.payment_status,'未付款') AS payment_status,
             COALESCE(p.due_date,'') AS due_date
      FROM purchases p
      LEFT JOIN suppliers s ON s.id=p.supplier_id
      WHERE p.quote_id=$1
      ORDER BY p.purchase_date DESC, p.id DESC
    `,[id])).rows;

    const contracts = (await pool.query(`
      SELECT id, doc_no, doc_date, contract_name, amount
      FROM contracts
      WHERE client_id=$1
      ORDER BY doc_date DESC, id DESC
      LIMIT 20
    `,[quote.client_id])).rows;

    const acceptances = (await pool.query(`
      SELECT id, doc_no, doc_date, content, note
      FROM acceptances
      WHERE client_id=$1
      ORDER BY doc_date DESC, id DESC
      LIMIT 20
    `,[quote.client_id])).rows;

    const purchase_total = purchases.reduce((s,r)=>s + Number(r.total_amount||0),0);
    const paid_total = purchases.reduce((s,r)=>s + Number(r.paid_amount||0),0);
    const remaining_total = purchases.reduce((s,r)=>s + Number(r.remaining_amount||0),0);
    const quote_total = Number(quote.total || 0);
    const gross_profit = quote_total - purchase_total;
    const gross_margin = quote_total > 0 ? Math.round((gross_profit / quote_total) * 10000) / 100 : 0;

    const steps = [
      { key: 'quote_created', label: '已建立報價', done: !!quote.id, date: quote.quote_date || '' },
      { key: 'quote_signed', label: '已簽核', done: String(quote.sign_status||'') === '同意施作', date: quote.quote_date || '' },
      { key: 'purchase_created', label: '已建立進貨', done: purchases.length > 0, date: purchases[0]?.purchase_date || '' },
      { key: 'running', label: '施工中', done: String(quote.progress||'') === '進行中', date: '' },
      { key: 'accepted', label: '已驗收', done: acceptances.length > 0 || String(quote.progress||'') === '已完成', date: acceptances[0]?.doc_date || '' },
      { key: 'paid', label: '已完成付款', done: remaining_total <= 0 && purchases.length > 0, date: '' }
    ];

    res.json({
      quote,
      purchases,
      contracts,
      acceptances,
      lifecycle: {
        quote_total,
        purchase_total,
        paid_total,
        remaining_total,
        gross_profit,
        gross_margin,
        steps
      }
    });
  } catch (err) {
    console.error('project lifecycle error:', err);
    res.status(500).json({ error: 'project_lifecycle_failed', detail: err.message });
  }
});

app.get('/api/projects/lifecycle-board', authRequired, async (req, res) => {
  try {
    const rows = (await pool.query(`
      SELECT
        q.id,
        q.quote_no,
        q.quote_date,
        COALESCE(c.client_name,'未指定客戶') AS client_name,
        COALESCE(q.project_name,'未命名工程') AS project_name,
        COALESCE(q.sign_status,'尚未簽核') AS sign_status,
        COALESCE(q.progress,'待安排') AS progress,
        COALESCE(q.total,0) AS quote_total,
        COALESCE(SUM(p.total_amount),0) AS purchase_total,
        COALESCE(SUM(p.remaining_amount),0) AS remaining_total,
        COALESCE(COUNT(p.id),0)::int AS purchase_count,
        CASE WHEN EXISTS (
          SELECT 1 FROM acceptances a WHERE a.client_id=q.client_id
        ) THEN TRUE ELSE FALSE END AS has_acceptance
      FROM quotes q
      LEFT JOIN clients c ON c.id=q.client_id
      LEFT JOIN purchases p ON p.quote_id=q.id
      GROUP BY q.id, q.quote_no, q.quote_date, c.client_name, q.project_name, q.sign_status, q.progress, q.total, q.client_id
      ORDER BY q.quote_date DESC, q.id DESC
      LIMIT 200
    `)).rows;
    res.json({ rows });
  } catch (err) {
    console.error('lifecycle board error:', err);
    res.json({ rows: [], warning: 'lifecycle_board_failed' });
  }
});


app.delete('/api/users/:id', authRequired, adminRequired, requireNumericId, async (req, res) => {
  try {
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ error: 'invalid_id' });
    if (req.user && Number(req.user.id) === id) return res.status(400).json({ error: 'cannot_delete_self' });
    const row = (await pool.query(`DELETE FROM users WHERE id=$1 RETURNING id`, [id])).rows[0];
    if (!row) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true, id });
  } catch (err) {
    console.error('delete user error:', err);
    res.status(500).json({ error: 'delete_user_failed', detail: err.message });
  }
});

app.get('/api/system/backup/all', authRequired, adminRequired, async (req, res) => {
  try {
    const tables = {
      users: 'SELECT id, username, role, created_at, updated_at FROM users ORDER BY id',
      clients: 'SELECT * FROM clients ORDER BY id',
      suppliers: 'SELECT * FROM suppliers ORDER BY id',
      equipment_categories: 'SELECT * FROM equipment_categories ORDER BY id',
      units: 'SELECT * FROM units ORDER BY id',
      equipment: 'SELECT * FROM equipment ORDER BY id',
      quotes: 'SELECT * FROM quotes ORDER BY id',
      quote_items: 'SELECT * FROM quote_items ORDER BY id',
      contracts: 'SELECT * FROM contracts ORDER BY id',
      acceptances: 'SELECT * FROM acceptances ORDER BY id',
      purchases: 'SELECT * FROM purchases ORDER BY id',
      purchase_items: 'SELECT * FROM purchase_items ORDER BY id',
      receipts: 'SELECT * FROM receipts ORDER BY id'
    };
    const data = {};
    for (const [name, sql] of Object.entries(tables)) {
      data[name] = (await pool.query(sql)).rows;
    }
    const payload = {
      app: 'yt_weak_current',
      version: 'V3.14.3',
      exported_at: new Date().toISOString(),
      tables: data
    };
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="yt_weak_current_backup_all.json"');
    res.end(JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error('backup export error:', err);
    res.status(500).json({ error: 'backup_export_failed', detail: err.message });
  }
});

app.post('/api/system/backup/import', authRequired, adminRequired, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file_required' });
    const raw = req.file.buffer.toString('utf-8');
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (e) {
      return res.status(400).json({ error: 'invalid_json_file' });
    }
    const tables = payload?.tables || {};
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const order = [
        'purchase_items',
        'quote_items',
        'receipts',
        'purchases',
        'acceptances',
        'contracts',
        'quotes',
        'equipment',
        'units',
        'equipment_categories',
        'suppliers',
        'clients',
        'users'
      ];
      for (const t of order) {
        if (Object.prototype.hasOwnProperty.call(tables, t)) {
          await client.query(`DELETE FROM ${t}`);
        }
      }

      const insertRows = async (table, rows) => {
        if (!Array.isArray(rows) || !rows.length) return;
        const cols = Object.keys(rows[0]);
        const placeholders = rows.map((row, rIdx) => {
          const ps = cols.map((_, cIdx) => `$${rIdx * cols.length + cIdx + 1}`);
          return `(${ps.join(',')})`;
        }).join(',');
        const values = [];
        rows.forEach(row => cols.forEach(c => values.push(row[c])));
        await client.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES ${placeholders}`, values);
      };

      const restoreOrder = [
        'users',
        'clients',
        'suppliers',
        'equipment_categories',
        'units',
        'equipment',
        'quotes',
        'contracts',
        'acceptances',
        'purchases',
        'receipts',
        'quote_items',
        'purchase_items'
      ];
      for (const t of restoreOrder) {
        if (Object.prototype.hasOwnProperty.call(tables, t)) {
          await insertRows(t, tables[t]);
        }
      }

      const sequenceMap = {
        users: 'users_id_seq',
        clients: 'clients_id_seq',
        suppliers: 'suppliers_id_seq',
        equipment_categories: 'equipment_categories_id_seq',
        units: 'units_id_seq',
        equipment: 'equipment_id_seq',
        quotes: 'quotes_id_seq',
        quote_items: 'quote_items_id_seq',
        contracts: 'contracts_id_seq',
        acceptances: 'acceptances_id_seq',
        purchases: 'purchases_id_seq',
        purchase_items: 'purchase_items_id_seq',
        receipts: 'receipts_id_seq'
      };
      for (const [table, seq] of Object.entries(sequenceMap)) {
        if (Object.prototype.hasOwnProperty.call(tables, table)) {
          await client.query(`SELECT setval('${seq}', COALESCE((SELECT MAX(id) FROM ${table}), 1), true)`);
        }
      }

      await client.query('COMMIT');
      res.json({ ok: true, message: 'backup_import_success' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('backup import error:', err);
    res.status(500).json({ error: 'backup_import_failed', detail: err.message });
  }
});


app.get('/api/system/backup/native/check', authRequired, adminRequired, async (req, res) => {
  try {
    let dumpOk = false, restoreOk = false, version = '';
    try {
      const r1 = await execFileAsync('pg_dump', ['--version']);
      dumpOk = true;
      version = String(r1.stdout || r1.stderr || '').trim();
    } catch (e) {}
    try {
      await execFileAsync('psql', ['--version']);
      restoreOk = true;
    } catch (e) {}
    res.json({ pg_dump: dumpOk, psql: restoreOk, version });
  } catch (err) {
    res.json({ pg_dump: false, psql: false, version: '', warning: 'native_backup_check_failed' });
  }
});

app.get('/api/system/backup/native/export', authRequired, adminRequired, async (req, res) => {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return res.status(500).json({ error: 'missing_database_url' });
    const tempFile = path.join(os.tmpdir(), `yt_native_backup_${Date.now()}.sql`);
    try {
      await execFileAsync('pg_dump', ['--no-owner', '--no-privileges', '--clean', '--if-exists', '--dbname=' + dbUrl, '--file=' + tempFile]);
    } catch (e) {
      return res.status(500).json({ error: 'pg_dump_unavailable', detail: e.stderr || e.message });
    }
    res.download(tempFile, 'yt_weak_current_native_backup.sql', (err) => {
      try { fs.unlinkSync(tempFile); } catch (e) {}
      if (err) console.error('native export download error:', err);
    });
  } catch (err) {
    console.error('native backup export error:', err);
    res.status(500).json({ error: 'native_backup_export_failed', detail: err.message });
  }
});

app.post('/api/system/backup/native/import', authRequired, adminRequired, upload.single('file'), async (req, res) => {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return res.status(500).json({ error: 'missing_database_url' });
    if (!req.file) return res.status(400).json({ error: 'file_required' });
    const tempFile = path.join(os.tmpdir(), `yt_native_restore_${Date.now()}.sql`);
    fs.writeFileSync(tempFile, req.file.buffer);
    try {
      await execFileAsync('psql', [dbUrl, '-f', tempFile]);
    } catch (e) {
      try { fs.unlinkSync(tempFile); } catch (x) {}
      return res.status(500).json({ error: 'psql_unavailable_or_restore_failed', detail: e.stderr || e.message });
    }
    try { fs.unlinkSync(tempFile); } catch (e) {}
    res.json({ ok: true, message: 'native_backup_import_success' });
  } catch (err) {
    console.error('native backup import error:', err);
    res.status(500).json({ error: 'native_backup_import_failed', detail: err.message });
  }
});



app.get('/api/receipt-available-quotes', authRequired, async (req,res) => {
  const excludeReceiptId = Number(req.query.exclude_receipt_id || 0);
  let rows;
  if (excludeReceiptId) {
    rows = (await pool.query(`
      SELECT q.*, COALESCE(c.client_name,'') AS client_name
      FROM quotes q
      LEFT JOIN clients c ON c.id=q.client_id
      WHERE q.id NOT IN (
        SELECT quote_id FROM receipts WHERE quote_id IS NOT NULL AND id <> $1
      )
      ORDER BY q.id DESC
    `, [excludeReceiptId])).rows;
  } else {
    rows = (await pool.query(`
      SELECT q.*, COALESCE(c.client_name,'') AS client_name
      FROM quotes q
      LEFT JOIN clients c ON c.id=q.client_id
      WHERE q.id NOT IN (
        SELECT quote_id FROM receipts WHERE quote_id IS NOT NULL
      )
      ORDER BY q.id DESC
    `)).rows;
  }
  res.json(rows);
});

app.get('/api/receipts', authRequired, async (req,res) => {
  const r = await pool.query(`
    SELECT rc.*, COALESCE(c.client_name, rc.client_name, '未指定客戶') AS client_name_display
    FROM receipts rc
    LEFT JOIN clients c ON c.id = rc.client_id
    ORDER BY rc.id DESC
  `);
  res.json(r.rows);
});

app.get('/api/receipts/:id', authRequired, requireNumericId, async (req,res) => {
  const r = await pool.query(`SELECT * FROM receipts WHERE id=$1`, [req.params.id]);
  if(!r.rows.length) return res.status(404).json({ error:'not found' });
  res.json(r.rows[0]);
});

app.get('/api/receipts-summary/:quote_id', authRequired, requireNumericId, async (req,res) => {
  const q = await pool.query(`SELECT q.id,q.quote_no,q.quote_date,q.client_id,q.project_name,q.total,COALESCE(c.client_name,'') AS client_name FROM quotes q LEFT JOIN clients c ON c.id=q.client_id WHERE q.id=$1`, [req.params.quote_id]);
  if(!q.rows.length) return res.status(404).json({ error:'quote_not_found' });
  const s = await pool.query(`SELECT COALESCE(SUM(amount_received),0) AS received_total FROM receipts WHERE quote_id=$1`, [req.params.quote_id]);
  const quote = q.rows[0];
  const received = Number(s.rows[0].received_total || 0);
  const total = Number(quote.total || 0);
  res.json({
    quote_id: quote.id,
    quote_no: quote.quote_no || '',
    quote_date: quote.quote_date || '',
    client_id: quote.client_id || null,
    client_name: quote.client_name || '',
    project_name: quote.project_name || '',
    quote_total: total,
    received_total: received,
    remaining_balance: Math.max(total - received, 0)
  });
});

async function saveReceipt(id, body){
  const amount = Number(body.amount_received || 0);
  if (amount <= 0) {
    const err = new Error('amount_required');
    err.statusCode = 400;
    throw err;
  }

  if (body.quote_id) {
    const dup = await pool.query(
      `SELECT id FROM receipts WHERE quote_id=$1 ${id ? 'AND id<>$2' : ''} LIMIT 1`,
      [body.quote_id].concat(id ? [id] : [])
    );
    if (dup.rows.length) {
      const err = new Error('quote_already_has_receipt');
      err.statusCode = 400;
      throw err;
    }
  }

  const summary = body.quote_id ? await pool.query(`SELECT COALESCE(SUM(amount_received),0) AS received_total FROM receipts WHERE quote_id=$1 ${id ? 'AND id<>$2' : ''}`, [body.quote_id].concat(id ? [id] : [])) : { rows:[{received_total:0}] };
  let quoteInfo = { quote_no: body.quote_no || '', project_name: body.project_name || '', client_id: body.client_id || null, client_name: body.client_name || '', quote_total: Number(body.quote_total||0) };
  if(body.quote_id){
    const q = await pool.query(`SELECT q.quote_no,q.project_name,q.client_id,q.total,COALESCE(c.client_name,'') AS client_name FROM quotes q LEFT JOIN clients c ON c.id=q.client_id WHERE q.id=$1`, [body.quote_id]);
    if(q.rows.length) quoteInfo = { ...quoteInfo, ...q.rows[0], quote_total: Number(q.rows[0].total||0) };
  }
  const receivedTotalBefore = Number(summary.rows[0].received_total || 0);
  if (Number(quoteInfo.quote_total || 0) > 0 && amount > Number(quoteInfo.quote_total || 0)) {
    const err = new Error('amount_exceeds_quote_total');
    err.statusCode = 400;
    throw err;
  }
  const receivedTotalAfter = receivedTotalBefore + amount;
  const remainingBalance = Math.max(Number(quoteInfo.quote_total || 0) - receivedTotalAfter, 0);
  const vals = [
    body.receipt_no || '',
    body.receipt_date || '',
    body.quote_id || null,
    quoteInfo.client_id || null,
    quoteInfo.quote_no || '',
    quoteInfo.project_name || '',
    quoteInfo.client_name || '',
    body.receipt_type || '部分收款',
    body.payment_method || '現金',
    body.payment_status || '已收訖',
    amount,
    receivedTotalAfter,
    remainingBalance,
    body.note || ''
  ];
  if(id){
    const r = await pool.query(`UPDATE receipts SET receipt_no=$1,receipt_date=$2,quote_id=$3,client_id=$4,quote_no=$5,project_name=$6,client_name=$7,receipt_type=$8,payment_method=$9,payment_status=$10,amount_received=$11,received_total_after=$12,remaining_balance=$13,note=$14,updated_at=CURRENT_TIMESTAMP WHERE id=$15 RETURNING *`, vals.concat([id]));
    return r.rows[0];
  } else {
    const r = await pool.query(`INSERT INTO receipts (receipt_no,receipt_date,quote_id,client_id,quote_no,project_name,client_name,receipt_type,payment_method,payment_status,amount_received,received_total_after,remaining_balance,note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`, vals);
    return r.rows[0];
  }
}

app.post('/api/receipts', authRequired, adminRequired, async (req,res) => {
  try {
    const r = await saveReceipt(null, req.body || {});
    res.json({ ok:true, id:r.id });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.put('/api/receipts/:id', authRequired, adminRequired, requireNumericId, async (req,res) => {
  try {
    const r = await saveReceipt(req.params.id, req.body || {});
    res.json({ ok:true, id:r.id });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.delete('/api/receipts/:id', authRequired, adminRequired, requireNumericId, async (req,res) => {
  await pool.query(`DELETE FROM receipts WHERE id=$1`, [req.params.id]);
  res.json({ ok:true });
});

app.get('/api/export/receipts', authRequired, async (req,res) => {
  const rows = (await pool.query(`SELECT receipt_no AS "收據編號", receipt_date AS "收據日期", quote_no AS "報價單號", project_name AS "工程名稱", client_name AS "客戶名稱", receipt_type AS "收款類型", payment_method AS "收款方式", payment_status AS "款項狀態", amount_received AS "本次收款", received_total_after AS "累計已收", remaining_balance AS "剩餘未收", note AS "備註" FROM receipts ORDER BY id DESC`)).rows;
  sendWorkbook(res, 'receipts_export.xlsx', [{ name:'receipts', rows }]);
});

app.get('/api/export/clients', authRequired, async (req,res) => {
  const rows = (await pool.query(`SELECT client_name AS "客戶名稱", tax_id AS "統一編號", contact_person AS "聯絡人", phone AS "電話", address AS "地址", job_title AS "職位" FROM clients ORDER BY id DESC`)).rows;
  sendExcel(res, 'clients.xlsx', rows, 'clients');
});
app.post('/api/import/clients', authRequired, adminRequired, upload.single('file'), async (req,res) => {
  const rows = parseWorkbook(req.file.buffer); let imported=0;
  for(const r of rows){
    if(!r['客戶名稱']) continue;
    await pool.query(`INSERT INTO clients (client_name,tax_id,contact_person,phone,address,job_title) VALUES ($1,$2,$3,$4,$5,$6)`, [r['客戶名稱']||'', r['統一編號']||'', r['聯絡人']||'', r['電話']||'', r['地址']||'', r['職位']||'']);
    imported++;
  }
  res.json({ imported });
});

app.get('/api/export/suppliers', authRequired, async (req,res) => {
  const rows = (await pool.query(`SELECT name AS "供應商名稱", tax_id AS "統一編號", contact_person AS "聯絡人", phone AS "電話", address AS "地址", bank_info AS "匯款帳號", note AS "備註" FROM suppliers ORDER BY id DESC`)).rows;
  sendExcel(res, 'suppliers.xlsx', rows, 'suppliers');
});
app.post('/api/import/suppliers', authRequired, adminRequired, upload.single('file'), async (req,res) => {
  const rows = parseWorkbook(req.file.buffer); let imported=0;
  for(const r of rows){
    if(!r['供應商名稱']) continue;
    await pool.query(`INSERT INTO suppliers (name,tax_id,contact_person,phone,address,bank_info,note) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [r['供應商名稱']||'', r['統一編號']||'', r['聯絡人']||'', r['電話']||'', r['地址']||'', r['匯款帳號']||'', r['備註']||'']);
    imported++;
  }
  res.json({ imported });
});

app.get('/api/export/equipment', authRequired, async (req,res) => {
  const rows = (await pool.query(`SELECT code AS "編號", category AS "類別", name AS "名稱", spec AS "規格", cost AS "成本", price AS "售價", profit AS "利潤", note AS "備註", link AS "連結" FROM equipment ORDER BY id DESC`)).rows;
  sendExcel(res, 'equipment.xlsx', rows, 'equipment');
});
app.post('/api/import/equipment', authRequired, adminRequired, upload.single('file'), async (req,res) => {
  const rows = parseWorkbook(req.file.buffer); let imported=0;
  for(const r of rows){
    if(!r['名稱']) continue;
    const cost = Number(r['成本']||0), price = Number(r['售價']||0);
    await pool.query(`INSERT INTO equipment (code,category,name,spec,cost,price,profit,note,link) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [r['編號']||'', r['類別']||'', r['名稱']||'', r['規格']||'', cost, price, price-cost, r['備註']||'', r['連結']||'']);
    imported++;
  }
  res.json({ imported });
});

app.get('/api/export/quotes', authRequired, async (req,res) => {
  const rows = (await pool.query(`SELECT quote_no AS "單號", quote_date AS "日期", project_name AS "工程名稱", subtotal AS "未稅", tax AS "稅額", total AS "合計", sign_status AS "簽核", progress AS "進度" FROM quotes ORDER BY id DESC`)).rows;
  sendExcel(res, 'quotes.xlsx', rows, 'quotes');
});


app.post('/api/import/quotes', authRequired, adminRequired, upload.single('file'), async (req,res) => {
  const rows = parseWorkbook(req.file.buffer); let imported=0;
  for(const r of rows){
    if(!r['單號'] || !r['工程名稱']) continue;
    await pool.query(`INSERT INTO quotes (quote_no, quote_date, project_name, subtotal, tax, total, sign_status, progress) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [r['單號']||'', r['日期']||'', r['工程名稱']||'', Number(r['未稅']||0), Number(r['稅額']||0), Number(r['合計']||0), r['簽核']||'尚未簽核', r['進度']||'待安排']);
    imported++;
  }
  res.json({ imported });
});
app.get('/api/export/contracts', authRequired, async (req,res) => {
  const rows = (await pool.query(`SELECT doc_no AS "單號", doc_date AS "日期", contract_name AS "合約名稱", scope AS "服務範圍", frequency AS "頻率", amount AS "金額", terms AS "條款" FROM contracts ORDER BY id DESC`)).rows;
  sendExcel(res, 'contracts.xlsx', rows, 'contracts');
});
app.post('/api/import/contracts', authRequired, adminRequired, upload.single('file'), async (req,res) => {
  const rows = parseWorkbook(req.file.buffer); let imported=0;
  for(const r of rows){
    if(!r['單號']) continue;
    await pool.query(`INSERT INTO contracts (doc_no, doc_date, contract_name, scope, frequency, amount, terms) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [r['單號']||'', r['日期']||'', r['合約名稱']||'', r['服務範圍']||'', r['頻率']||'', Number(r['金額']||0), r['條款']||'']);
    imported++;
  }
  res.json({ imported });
});
app.get('/api/export/acceptances', authRequired, async (req,res) => {
  const rows = (await pool.query(`SELECT doc_no AS "單號", doc_date AS "日期", content AS "驗收內容", note AS "備註" FROM acceptances ORDER BY id DESC`)).rows;
  sendExcel(res, 'acceptances.xlsx', rows, 'acceptances');
});
app.post('/api/import/acceptances', authRequired, adminRequired, upload.single('file'), async (req,res) => {
  const rows = parseWorkbook(req.file.buffer); let imported=0;
  for(const r of rows){
    if(!r['單號']) continue;
    await pool.query(`INSERT INTO acceptances (doc_no, doc_date, content, note) VALUES ($1,$2,$3,$4)`,
      [r['單號']||'', r['日期']||'', r['驗收內容']||'', r['備註']||'']);
    imported++;
  }
  res.json({ imported });
});
app.get('/api/export/purchases', authRequired, async (req,res) => {
  const rows = (await pool.query(`SELECT purchase_no AS "單號", purchase_date AS "日期", site_name AS "案場", total_amount AS "總額", paid_amount AS "已付", remaining_amount AS "未付", payment_status AS "付款狀態", payment_method AS "付款方式", due_date AS "到期日" FROM purchases ORDER BY id DESC`)).rows;
  sendExcel(res, 'purchases.xlsx', rows, 'purchases');
});
app.post('/api/import/purchases', authRequired, adminRequired, upload.single('file'), async (req,res) => {
  const rows = parseWorkbook(req.file.buffer); let imported=0;
  for(const r of rows){
    if(!r['單號']) continue;
    await pool.query(`INSERT INTO purchases (purchase_no, purchase_date, site_name, total_amount, paid_amount, remaining_amount, payment_status, payment_method, due_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [r['單號']||'', r['日期']||'', r['案場']||'', Number(r['總額']||0), Number(r['已付']||0), Number(r['未付']||0), r['付款狀態']||'未付款', r['付款方式']||'現金', r['到期日']||'']);
    imported++;
  }
  res.json({ imported });
});

app.get('/api/quotes/:id', authRequired, requireNumericId, async (req,res,next) => {
  const q = (await pool.query(`SELECT * FROM quotes WHERE id=$1`, [req.params.id])).rows[0];
  const items = (await pool.query(`SELECT * FROM quote_items WHERE quote_id=$1 ORDER BY item_order ASC`, [req.params.id])).rows;
  if(!q) return res.status(404).json({ error:'not found' });
  const lines = [`單號：${q.quote_no||''}`, `日期：${q.quote_date||''}`, `工程：${q.project_name||''}`, `合計：NT$ ${q.total||0}`, '', '項目：', ...items.map(x=>`${x.item_order}. ${x.item_desc||''} ${x.spec||''} x${x.qty||0} / NT$ ${x.unit_price||0}`)];
  createPdf(res, '工程報價單', lines);
});
app.get('/api/contracts/:id', authRequired, requireNumericId, async (req,res,next) => {
  const q = (await pool.query(`SELECT * FROM contracts WHERE id=$1`, [req.params.id])).rows[0];
  if(!q) return res.status(404).json({ error:'not found' });
  createPdf(res, '維護合約單', [`單號：${q.doc_no||''}`, `日期：${q.doc_date||''}`, `合約：${q.contract_name||''}`, `金額：NT$ ${q.amount||0}`, '', q.scope||'', '', q.terms||'']);
});
app.get('/api/acceptances/:id', authRequired, requireNumericId, async (req,res,next) => {
  const q = (await pool.query(`SELECT * FROM acceptances WHERE id=$1`, [req.params.id])).rows[0];
  if(!q) return res.status(404).json({ error:'not found' });
  createPdf(res, '驗收單', [`單號：${q.doc_no||''}`, `日期：${q.doc_date||''}`, '', q.content||'', '', q.note||'']);
});
app.get('/api/purchases/:id', authRequired, requireNumericId, async (req,res,next) => {
  const q = (await pool.query(`SELECT * FROM purchases WHERE id=$1`, [req.params.id])).rows[0];
  const items = (await pool.query(`SELECT * FROM purchase_items WHERE purchase_id=$1 ORDER BY item_order ASC`, [req.params.id])).rows;
  if(!q) return res.status(404).json({ error:'not found' });
  const lines = [`單號：${q.purchase_no||''}`, `日期：${q.purchase_date||''}`, `案場：${q.site_name||''}`, `總額：NT$ ${q.total_amount||0}`, '', '項目：', ...items.map(x=>`${x.item_order}. ${x.item_name||''} ${x.spec||''} x${x.qty||0} / NT$ ${x.unit_cost||0}`)];
  createPdf(res, '進貨單', lines);
});


app.get('/', (req,res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

const port = process.env.PORT || 3000;
initDb().then(() => {
  app.listen(port, '0.0.0.0', () => console.log('Server running on port ' + port));
}).catch(err => {
  console.error('Startup error:', err);
  process.exit(1);
});
