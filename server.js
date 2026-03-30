
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const ADMIN_USER = process.env.ADMIN_USER || 'adminoscar';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin0960770512';
const tokens = new Map();

function hashPwd(s){ return crypto.createHash('sha256').update(String(s)).digest('hex'); }
function ymdKey(){ const d = new Date(); return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`; }

async function nextDocNo(type){
  const map = { quote:'YA', contract:'YB', acceptance:'YC', purchase:'PI' };
  const target = {
    quote:{table:'quotes', col:'quote_no'},
    contract:{table:'contracts', col:'doc_no'},
    acceptance:{table:'acceptances', col:'doc_no'},
    purchase:{table:'purchases', col:'purchase_no'}
  }[type] || {table:'quotes', col:'quote_no'};
  const prefix = map[type] || 'YA';
  const dateKey = ymdKey();
  const r = await pool.query(`SELECT ${target.col} AS doc_no FROM ${target.table} WHERE ${target.col} LIKE $1 ORDER BY id DESC LIMIT 1`, [`${prefix}${dateKey}%`]);
  let next = 1;
  if(r.rows.length && r.rows[0].doc_no) next = Number(String(r.rows[0].doc_no).slice(-3)) + 1;
  return `${prefix}${dateKey}${String(next).padStart(3,'0')}`;
}

async function ensureAdmin(){
  const admin = await pool.query(`SELECT id FROM users WHERE username=$1`, [ADMIN_USER]);
  if(!admin.rows.length){
    await pool.query(`INSERT INTO users (username,password_hash,role) VALUES ($1,$2,'admin')`, [ADMIN_USER, hashPwd(ADMIN_PASS)]);
  }
}

async function initDb(){
  await pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('admin','viewer')), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS clients (id SERIAL PRIMARY KEY, client_name TEXT NOT NULL, tax_id TEXT, contact_person TEXT, phone TEXT, address TEXT, job_title TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS suppliers (id SERIAL PRIMARY KEY, name TEXT NOT NULL, tax_id TEXT, contact_person TEXT, phone TEXT, address TEXT, bank_info TEXT, note TEXT, is_favorite BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS equipment (id SERIAL PRIMARY KEY, code TEXT, name TEXT NOT NULL, spec TEXT, cost INTEGER DEFAULT 0, price INTEGER DEFAULT 0, profit INTEGER DEFAULT 0, note TEXT, link TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS quotes (id SERIAL PRIMARY KEY, quote_no TEXT, quote_date TEXT, client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL, project_name TEXT NOT NULL, subtotal INTEGER DEFAULT 0, tax INTEGER DEFAULT 0, total INTEGER DEFAULT 0, quote_desc TEXT, quote_terms TEXT, sign_status TEXT DEFAULT '尚未簽核', progress TEXT DEFAULT '待安排', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS quote_items (id SERIAL PRIMARY KEY, quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE, item_order INTEGER, item_desc TEXT, qty INTEGER DEFAULT 0, unit_price INTEGER DEFAULT 0, item_total INTEGER DEFAULT 0)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS contracts (id SERIAL PRIMARY KEY, doc_no TEXT, doc_date TEXT, client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL, contract_name TEXT, scope TEXT, frequency TEXT, amount INTEGER DEFAULT 0, terms TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS acceptances (id SERIAL PRIMARY KEY, doc_no TEXT, doc_date TEXT, client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL, content TEXT, note TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS purchases (id SERIAL PRIMARY KEY, purchase_no TEXT, purchase_date TEXT, supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL, quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL, site_name TEXT, memo TEXT, subtotal_amount INTEGER DEFAULT 0, tax_amount INTEGER DEFAULT 0, total_amount INTEGER DEFAULT 0, payment_status TEXT DEFAULT '未付款', payment_method TEXT DEFAULT '現金', due_date TEXT, paid_amount INTEGER DEFAULT 0, remaining_amount INTEGER DEFAULT 0, paid_date TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS system_settings (id INTEGER PRIMARY KEY DEFAULT 1, company_name TEXT, company_tag TEXT, company_phone TEXT, company_address TEXT, quote_prefix TEXT DEFAULT 'YA', contract_prefix TEXT DEFAULT 'YB', acceptance_prefix TEXT DEFAULT 'YC', purchase_prefix TEXT DEFAULT 'PI', serial_digits INTEGER DEFAULT 3, smtp_host TEXT, smtp_port TEXT, smtp_user TEXT, smtp_pass TEXT, smtp_secure BOOLEAN DEFAULT FALSE, mail_from TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  await pool.query(`INSERT INTO system_settings (id, company_name, company_tag, company_phone, company_address) VALUES (1,'昱拓弱電有限公司','弱電系統維修｜監控｜門禁｜對講｜車道停管｜BA中央監控','0960-770-512','桃園市中壢區榮安一街490號13樓') ON CONFLICT (id) DO NOTHING`);
  await pool.query(`CREATE TABLE IF NOT EXISTS purchase_items (id SERIAL PRIMARY KEY, purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE, item_order INTEGER, equipment_id INTEGER REFERENCES equipment(id) ON DELETE SET NULL, item_name TEXT, spec TEXT, qty INTEGER DEFAULT 0, unit TEXT, unit_cost INTEGER DEFAULT 0, item_total INTEGER DEFAULT 0)`);
  await ensureAdmin();
}

function authRequired(req,res,next){
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const user = tokens.get(token);
  if(!user) return res.status(401).json({ error:'unauthorized' });
  req.user = user;
  next();
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
  const token = crypto.randomBytes(24).toString('hex');
  tokens.set(token, { id: row.id, username: row.username, role: row.role });
  res.json({ token, username: row.username, role: row.role });
});

app.get('/api/users', authRequired, adminRequired, async (req,res) => res.json((await pool.query(`SELECT id,username,role,created_at FROM users ORDER BY id DESC`)).rows));
app.post('/api/users', authRequired, adminRequired, async (req,res) => {
  const { username, password, role } = req.body;
  const r = await pool.query(`INSERT INTO users (username,password_hash,role) VALUES ($1,$2,$3) RETURNING id,username,role,created_at`, [username, hashPwd(password), role === 'admin' ? 'admin' : 'viewer']);
  res.json(r.rows[0]);
});
app.put('/api/users/:id', authRequired, adminRequired, async (req,res) => {
  const { username, password, role } = req.body;
  let r;
  if(password){
    r = await pool.query(`UPDATE users SET username=$1,password_hash=$2,role=$3 WHERE id=$4 RETURNING id,username,role,created_at`, [username, hashPwd(password), role === 'admin' ? 'admin' : 'viewer', req.params.id]);
  } else {
    r = await pool.query(`UPDATE users SET username=$1,role=$2 WHERE id=$3 RETURNING id,username,role,created_at`, [username, role === 'admin' ? 'admin' : 'viewer', req.params.id]);
  }
  res.json(r.rows[0]);
});

app.get('/api/clients', authRequired, async (req,res) => res.json((await pool.query(`SELECT * FROM clients ORDER BY id DESC`)).rows));
app.post('/api/clients', authRequired, adminRequired, async (req,res) => {
  const d=req.body;
  const r = await pool.query(`INSERT INTO clients (client_name,tax_id,contact_person,phone,address,job_title) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [d.client_name||'', d.tax_id||'', d.contact_person||'', d.phone||'', d.address||'', d.job_title||'']);
  res.json(r.rows[0]);
});
app.put('/api/clients/:id', authRequired, adminRequired, async (req,res) => {
  const d=req.body;
  const r = await pool.query(`UPDATE clients SET client_name=$1,tax_id=$2,contact_person=$3,phone=$4,address=$5,job_title=$6 WHERE id=$7 RETURNING *`, [d.client_name||'', d.tax_id||'', d.contact_person||'', d.phone||'', d.address||'', d.job_title||'', req.params.id]);
  res.json(r.rows[0]);
});
app.delete('/api/clients/:id', authRequired, adminRequired, async (req,res) => { await pool.query(`DELETE FROM clients WHERE id=$1`, [req.params.id]); res.json({ ok:true }); });

app.get('/api/suppliers', authRequired, async (req,res) => res.json((await pool.query(`SELECT * FROM suppliers ORDER BY is_favorite DESC,id DESC`)).rows));
app.post('/api/suppliers', authRequired, adminRequired, async (req,res) => {
  const d=req.body;
  const r = await pool.query(`INSERT INTO suppliers (name,tax_id,contact_person,phone,address,bank_info,note,is_favorite) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [d.name||'', d.tax_id||'', d.contact_person||'', d.phone||'', d.address||'', d.bank_info||'', d.note||'', !!d.is_favorite]);
  res.json(r.rows[0]);
});
app.put('/api/suppliers/:id', authRequired, adminRequired, async (req,res) => {
  const d=req.body;
  const r = await pool.query(`UPDATE suppliers SET name=$1,tax_id=$2,contact_person=$3,phone=$4,address=$5,bank_info=$6,note=$7,is_favorite=$8 WHERE id=$9 RETURNING *`, [d.name||'', d.tax_id||'', d.contact_person||'', d.phone||'', d.address||'', d.bank_info||'', d.note||'', !!d.is_favorite, req.params.id]);
  res.json(r.rows[0]);
});
app.delete('/api/suppliers/:id', authRequired, adminRequired, async (req,res) => { await pool.query(`DELETE FROM suppliers WHERE id=$1`, [req.params.id]); res.json({ ok:true }); });

app.get('/api/equipment', authRequired, async (req,res) => res.json((await pool.query(`SELECT * FROM equipment ORDER BY id DESC`)).rows));
app.post('/api/equipment', authRequired, adminRequired, async (req,res) => {
  const d=req.body; const profit=Number(d.price||0)-Number(d.cost||0);
  const r = await pool.query(`INSERT INTO equipment (code,name,spec,cost,price,profit,note,link) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [d.code||'', d.name||'', d.spec||'', Number(d.cost||0), Number(d.price||0), profit, d.note||'', d.link||'']);
  res.json(r.rows[0]);
});
app.put('/api/equipment/:id', authRequired, adminRequired, async (req,res) => {
  const d=req.body; const profit=Number(d.price||0)-Number(d.cost||0);
  const r = await pool.query(`UPDATE equipment SET code=$1,name=$2,spec=$3,cost=$4,price=$5,profit=$6,note=$7,link=$8 WHERE id=$9 RETURNING *`, [d.code||'', d.name||'', d.spec||'', Number(d.cost||0), Number(d.price||0), profit, d.note||'', d.link||'', req.params.id]);
  res.json(r.rows[0]);
});
app.delete('/api/equipment/:id', authRequired, adminRequired, async (req,res) => { await pool.query(`DELETE FROM equipment WHERE id=$1`, [req.params.id]); res.json({ ok:true }); });

app.get('/api/serials/next', authRequired, async (req,res) => res.json({ doc_no: await nextDocNo(req.query.type || 'quote') }));

// Quotes
app.get('/api/quotes', authRequired, async (req,res) => res.json((await pool.query(`SELECT * FROM quotes ORDER BY id DESC`)).rows));
app.get('/api/quotes/:id', authRequired, async (req,res) => {
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
    await pool.query(`INSERT INTO quote_items (quote_id,item_order,item_desc,qty,unit_price,item_total) VALUES ($1,$2,$3,$4,$5,$6)`, [q.id, item.item_order||0, item.item_desc||'', qty, unitPrice, itemTotal]);
  }
  return q;
}
app.post('/api/quotes', authRequired, adminRequired, async (req,res) => { const q = await saveQuote(null, req.body); res.json({ ok:true, id:q.id }); });
app.put('/api/quotes/:id', authRequired, adminRequired, async (req,res) => { const q = await saveQuote(req.params.id, req.body); res.json({ ok:true, id:q.id }); });
app.delete('/api/quotes/:id', authRequired, adminRequired, async (req,res) => { await pool.query(`DELETE FROM quotes WHERE id=$1`, [req.params.id]); res.json({ ok:true }); });

app.get('/api/quote-tracking', authRequired, async (req,res) => res.json((await pool.query(`SELECT * FROM quotes ORDER BY id DESC`)).rows));
app.put('/api/quote-tracking/:id', authRequired, adminRequired, async (req,res) => {
  const d=req.body;
  const r = await pool.query(`UPDATE quotes SET sign_status=$1,progress=$2 WHERE id=$3 RETURNING *`, [d.sign_status||'尚未簽核', d.progress||'待安排', req.params.id]);
  res.json(r.rows[0]);
});

// Contracts
app.get('/api/contracts', authRequired, async (req,res) => res.json((await pool.query(`SELECT * FROM contracts ORDER BY id DESC`)).rows));
app.get('/api/contracts/:id', authRequired, async (req,res) => { const r=await pool.query(`SELECT * FROM contracts WHERE id=$1`, [req.params.id]); if(!r.rows.length) return res.status(404).json({error:'not found'}); res.json(r.rows[0]); });
app.post('/api/contracts', authRequired, adminRequired, async (req,res) => {
  const d=req.body;
  const r=await pool.query(`INSERT INTO contracts (doc_no,doc_date,client_id,contract_name,scope,frequency,amount,terms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [d.doc_no||'', d.doc_date||'', d.client_id||null, d.contract_name||'', d.scope||'', d.frequency||'', Number(d.amount||0), d.terms||'']);
  res.json(r.rows[0]);
});
app.put('/api/contracts/:id', authRequired, adminRequired, async (req,res) => {
  const d=req.body;
  const r=await pool.query(`UPDATE contracts SET doc_no=$1,doc_date=$2,client_id=$3,contract_name=$4,scope=$5,frequency=$6,amount=$7,terms=$8 WHERE id=$9 RETURNING *`, [d.doc_no||'', d.doc_date||'', d.client_id||null, d.contract_name||'', d.scope||'', d.frequency||'', Number(d.amount||0), d.terms||'', req.params.id]);
  res.json(r.rows[0]);
});
app.delete('/api/contracts/:id', authRequired, adminRequired, async (req,res) => { await pool.query(`DELETE FROM contracts WHERE id=$1`, [req.params.id]); res.json({ ok:true }); });

// Acceptances
app.get('/api/acceptances', authRequired, async (req,res) => res.json((await pool.query(`SELECT * FROM acceptances ORDER BY id DESC`)).rows));
app.get('/api/acceptances/:id', authRequired, async (req,res) => { const r=await pool.query(`SELECT * FROM acceptances WHERE id=$1`, [req.params.id]); if(!r.rows.length) return res.status(404).json({error:'not found'}); res.json(r.rows[0]); });
app.post('/api/acceptances', authRequired, adminRequired, async (req,res) => {
  const d=req.body;
  const r=await pool.query(`INSERT INTO acceptances (doc_no,doc_date,client_id,content,note) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [d.doc_no||'', d.doc_date||'', d.client_id||null, d.content||'', d.note||'']);
  res.json(r.rows[0]);
});
app.put('/api/acceptances/:id', authRequired, adminRequired, async (req,res) => {
  const d=req.body;
  const r=await pool.query(`UPDATE acceptances SET doc_no=$1,doc_date=$2,client_id=$3,content=$4,note=$5 WHERE id=$6 RETURNING *`, [d.doc_no||'', d.doc_date||'', d.client_id||null, d.content||'', d.note||'', req.params.id]);
  res.json(r.rows[0]);
});
app.delete('/api/acceptances/:id', authRequired, adminRequired, async (req,res) => { await pool.query(`DELETE FROM acceptances WHERE id=$1`, [req.params.id]); res.json({ ok:true }); });

// Purchases
app.get('/api/purchases', authRequired, async (req,res) => {
  const r = await pool.query(`SELECT p.*, s.name AS supplier_name, q.quote_no FROM purchases p LEFT JOIN suppliers s ON s.id=p.supplier_id LEFT JOIN quotes q ON q.id=p.quote_id ORDER BY p.id DESC`);
  res.json(r.rows);
});
app.get('/api/purchases/:id', authRequired, async (req,res) => {
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
app.put('/api/purchases/:id', authRequired, adminRequired, async (req,res) => { const p = await savePurchase(req.params.id, req.body); res.json({ ok:true, id:p.id }); });
app.delete('/api/purchases/:id', authRequired, adminRequired, async (req,res) => { await pool.query(`DELETE FROM purchases WHERE id=$1`, [req.params.id]); res.json({ ok:true }); });
app.get('/api/payables', authRequired, async (req,res) => {
  const r = await pool.query(`SELECT p.id,p.purchase_no,p.payment_status,p.payment_method,p.due_date,p.paid_date,p.total_amount,p.paid_amount,p.remaining_amount,s.name AS supplier_name FROM purchases p LEFT JOIN suppliers s ON s.id=p.supplier_id ORDER BY COALESCE(p.due_date,''), p.id DESC`);
  res.json(r.rows);
});


app.get('/api/system-settings', authRequired, async (req,res) => {
  const r = await pool.query(`SELECT * FROM system_settings WHERE id=1`);
  res.json(r.rows[0] || {});
});
app.put('/api/system-settings', authRequired, adminRequired, async (req,res) => {
  const d=req.body;
  const r = await pool.query(`UPDATE system_settings SET company_name=$1,company_tag=$2,company_phone=$3,company_address=$4,quote_prefix=$5,contract_prefix=$6,acceptance_prefix=$7,purchase_prefix=$8,serial_digits=$9,smtp_host=$10,smtp_port=$11,smtp_user=$12,smtp_pass=$13,smtp_secure=$14,mail_from=$15,updated_at=CURRENT_TIMESTAMP WHERE id=1 RETURNING *`,
    [d.company_name||'',d.company_tag||'',d.company_phone||'',d.company_address||'',d.quote_prefix||'YA',d.contract_prefix||'YB',d.acceptance_prefix||'YC',d.purchase_prefix||'PI',Number(d.serial_digits||3),d.smtp_host||'',d.smtp_port||'',d.smtp_user||'',d.smtp_pass||'',!!d.smtp_secure,d.mail_from||'']);
  res.json(r.rows[0]);
});

app.get('/', (req,res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

const port = process.env.PORT || 3000;
initDb().then(() => {
  app.listen(port, '0.0.0.0', () => console.log('Server running on port ' + port));
}).catch(err => {
  console.error('Startup error:', err);
  process.exit(1);
});
