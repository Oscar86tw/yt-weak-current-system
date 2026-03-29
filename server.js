
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const ADMIN_USER = process.env.ADMIN_USER || 'adminoscar';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin0960770512';
const tokens = new Map();

function hashPwd(s){ return crypto.createHash('sha256').update(String(s)).digest('hex'); }
async function ensureDefaultAdmin(){
  const r = await pool.query(`SELECT id FROM users WHERE username=$1`, [ADMIN_USER]);
  if (!r.rows.length){
    await pool.query(`INSERT INTO users (username,password_hash,role) VALUES ($1,$2,'admin')`, [ADMIN_USER, hashPwd(ADMIN_PASS)]);
  }
}
function authRequired(req,res,next){
  const auth=req.headers.authorization||''; const token=auth.startsWith('Bearer ')?auth.slice(7):'';
  const user=tokens.get(token); if(!user) return res.status(401).json({error:'unauthorized'});
  req.user=user; next();
}
function adminRequired(req,res,next){ if(req.user.role!=='admin') return res.status(403).json({error:'forbidden'}); next(); }

async function initDb(){
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','viewer')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    client_name TEXT NOT NULL,
    tax_id TEXT,
    contact_person TEXT,
    phone TEXT,
    address TEXT,
    job_title TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    quote_no TEXT,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    quote_date TEXT,
    project_name TEXT NOT NULL,
    subtotal INTEGER DEFAULT 0,
    tax INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    quote_desc TEXT,
    quote_terms TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS quote_items (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
    item_order INTEGER,
    item_desc TEXT,
    qty INTEGER DEFAULT 0,
    unit_price INTEGER DEFAULT 0,
    item_total INTEGER DEFAULT 0
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    contract_name TEXT,
    contact_person TEXT,
    contact_phone TEXT,
    address TEXT,
    scope TEXT,
    frequency TEXT,
    amount INTEGER DEFAULT 0,
    terms TEXT,
    contact_job_title TEXT,
    customer_tax_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS acceptances (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    contact_person TEXT,
    contact_phone TEXT,
    address TEXT,
    content TEXT,
    note TEXT,
    contact_job_title TEXT,
    customer_tax_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`);
  await ensureDefaultAdmin();
}

app.post('/api/login', async (req,res) => {
  const { username, password } = req.body;
  const r = await pool.query(`SELECT id,username,role,password_hash FROM users WHERE username=$1`, [username || '']);
  if (!r.rows.length) return res.status(401).json({error:'invalid'});
  const row = r.rows[0];
  if (row.password_hash !== hashPwd(password || '')) return res.status(401).json({error:'invalid'});
  const token = crypto.randomBytes(24).toString('hex');
  tokens.set(token, { id: row.id, username: row.username, role: row.role });
  res.json({ token, username: row.username, role: row.role });
});

app.get('/api/users', authRequired, adminRequired, async (req,res) => {
  const r = await pool.query(`SELECT id,username,role,created_at FROM users ORDER BY id DESC`);
  res.json(r.rows);
});
app.post('/api/users', authRequired, adminRequired, async (req,res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({error:'username and password required'});
  const r = await pool.query(`INSERT INTO users (username,password_hash,role) VALUES ($1,$2,$3) RETURNING id,username,role,created_at`, [username, hashPwd(password), role === 'admin' ? 'admin' : 'viewer']);
  res.json(r.rows[0]);
});
app.put('/api/users/:id', authRequired, adminRequired, async (req,res) => {
  const { username, password, role } = req.body;
  let r;
  if (password){
    r = await pool.query(`UPDATE users SET username=$1,password_hash=$2,role=$3 WHERE id=$4 RETURNING id,username,role,created_at`, [username, hashPwd(password), role === 'admin' ? 'admin' : 'viewer', req.params.id]);
  } else {
    r = await pool.query(`UPDATE users SET username=$1,role=$2 WHERE id=$3 RETURNING id,username,role,created_at`, [username, role === 'admin' ? 'admin' : 'viewer', req.params.id]);
  }
  res.json(r.rows[0]);
});

app.get('/api/clients', authRequired, async (req,res) => { const r=await pool.query('SELECT * FROM clients ORDER BY id DESC'); res.json(r.rows); });
app.get('/api/clients/:id', authRequired, async (req,res) => { const r=await pool.query('SELECT * FROM clients WHERE id=$1',[req.params.id]); if(!r.rows.length) return res.status(404).json({error:'not found'}); res.json(r.rows[0]); });
app.post('/api/clients', authRequired, adminRequired, async (req,res) => {
  const { client_name,tax_id,contact_person,phone,address,job_title } = req.body;
  if(!client_name) return res.status(400).json({error:'client_name required'});
  const r=await pool.query(`INSERT INTO clients (client_name,tax_id,contact_person,phone,address,job_title) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [client_name,tax_id||'',contact_person||'',phone||'',address||'',job_title||'']);
  res.json(r.rows[0]);
});
app.put('/api/clients/:id', authRequired, adminRequired, async (req,res) => {
  const { client_name,tax_id,contact_person,phone,address,job_title } = req.body;
  const r=await pool.query(`UPDATE clients SET client_name=$1,tax_id=$2,contact_person=$3,phone=$4,address=$5,job_title=$6 WHERE id=$7 RETURNING *`, [client_name||'',tax_id||'',contact_person||'',phone||'',address||'',job_title||'',req.params.id]);
  res.json(r.rows[0]);
});
app.delete('/api/clients/:id', authRequired, adminRequired, async (req,res)=>{ await pool.query('DELETE FROM clients WHERE id=$1',[req.params.id]); res.json({ok:true}); });

app.get('/api/quotes/next-no', authRequired, async (req,res) => {
  const year=new Date().getFullYear(); const prefix=`YT-${year}-`;
  const r=await pool.query(`SELECT quote_no FROM quotes WHERE quote_no LIKE $1 ORDER BY id DESC LIMIT 1`, [`${prefix}%`]);
  let next=1; if(r.rows.length&&r.rows[0].quote_no){ const m=r.rows[0].quote_no.match(/YT-\d{4}-(\d+)/); if(m) next=Number(m[1])+1; }
  res.json({quote_no:`${prefix}${String(next).padStart(3,'0')}`});
});
app.get('/api/quotes', authRequired, async (req,res)=>{ const r=await pool.query(`SELECT q.*, c.client_name FROM quotes q LEFT JOIN clients c ON c.id=q.client_id ORDER BY q.id DESC`); res.json(r.rows); });
app.get('/api/quotes/:id', authRequired, async (req,res)=>{ const q=await pool.query(`SELECT * FROM quotes WHERE id=$1`, [req.params.id]); if(!q.rows.length) return res.status(404).json({error:'not found'}); const i=await pool.query(`SELECT * FROM quote_items WHERE quote_id=$1 ORDER BY item_order ASC,id ASC`, [req.params.id]); res.json({...q.rows[0], items:i.rows}); });
async function saveQuoteCore(id, body){
  const { quote_no,client_id,quote_date,project_name,quote_desc,quote_terms,items=[] } = body;
  if(!project_name) throw new Error('project_name required');
  const subtotal=items.reduce((s,i)=>s+(Number(i.qty||0)*Number(i.unit_price||0)),0), tax=Math.round(subtotal*0.05), total=subtotal+tax;
  let quote;
  if(id){
    const qr=await pool.query(`UPDATE quotes SET quote_no=$1,client_id=$2,quote_date=$3,project_name=$4,subtotal=$5,tax=$6,total=$7,quote_desc=$8,quote_terms=$9 WHERE id=$10 RETURNING *`, [quote_no||'',client_id||null,quote_date||'',project_name,subtotal,tax,total,quote_desc||'',quote_terms||'',id]);
    quote=qr.rows[0]; await pool.query(`DELETE FROM quote_items WHERE quote_id=$1`, [id]);
  } else {
    const qr=await pool.query(`INSERT INTO quotes (quote_no,client_id,quote_date,project_name,subtotal,tax,total,quote_desc,quote_terms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [quote_no||'',client_id||null,quote_date||'',project_name,subtotal,tax,total,quote_desc||'',quote_terms||'']);
    quote=qr.rows[0];
  }
  for (const item of items){
    const qty=Number(item.qty||0), unitPrice=Number(item.unit_price||0), itemTotal=qty*unitPrice;
    await pool.query(`INSERT INTO quote_items (quote_id,item_order,item_desc,qty,unit_price,item_total) VALUES ($1,$2,$3,$4,$5,$6)`, [quote.id,item.item_order||0,item.item_desc||'',qty,unitPrice,itemTotal]);
  }
  return quote;
}
app.post('/api/quotes', authRequired, adminRequired, async (req,res)=>{ try{ const quote=await saveQuoteCore(null, req.body); res.json({ok:true, quote_id:quote.id}); } catch(e){ res.status(400).json({error:e.message}); }});
app.put('/api/quotes/:id', authRequired, adminRequired, async (req,res)=>{ try{ const quote=await saveQuoteCore(req.params.id, req.body); res.json({ok:true, quote_id:quote.id}); } catch(e){ res.status(400).json({error:e.message}); }});

app.get('/api/contracts', authRequired, async (req,res)=>{ const r=await pool.query(`SELECT t.*, c.client_name FROM contracts t LEFT JOIN clients c ON c.id=t.client_id ORDER BY t.id DESC`); res.json(r.rows); });
app.get('/api/contracts/:id', authRequired, async (req,res)=>{ const r=await pool.query(`SELECT * FROM contracts WHERE id=$1`, [req.params.id]); if(!r.rows.length) return res.status(404).json({error:'not found'}); res.json(r.rows[0]); });
app.post('/api/contracts', authRequired, adminRequired, async (req,res)=>{ const {client_id,contract_name,contact_person,contact_phone,address,scope,frequency,amount,terms,contact_job_title,customer_tax_id}=req.body; const r=await pool.query(`INSERT INTO contracts (client_id,contract_name,contact_person,contact_phone,address,scope,frequency,amount,terms,contact_job_title,customer_tax_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [client_id||null,contract_name||'',contact_person||'',contact_phone||'',address||'',scope||'',frequency||'',Number(amount||0),terms||'',contact_job_title||'',customer_tax_id||'']); res.json(r.rows[0]); });
app.put('/api/contracts/:id', authRequired, adminRequired, async (req,res)=>{ const {client_id,contract_name,contact_person,contact_phone,address,scope,frequency,amount,terms,contact_job_title,customer_tax_id}=req.body; const r=await pool.query(`UPDATE contracts SET client_id=$1,contract_name=$2,contact_person=$3,contact_phone=$4,address=$5,scope=$6,frequency=$7,amount=$8,terms=$9,contact_job_title=$10,customer_tax_id=$11 WHERE id=$12 RETURNING *`, [client_id||null,contract_name||'',contact_person||'',contact_phone||'',address||'',scope||'',frequency||'',Number(amount||0),terms||'',contact_job_title||'',customer_tax_id||'',req.params.id]); res.json(r.rows[0]); });

app.get('/api/acceptances', authRequired, async (req,res)=>{ const r=await pool.query(`SELECT a.*, c.client_name FROM acceptances a LEFT JOIN clients c ON c.id=a.client_id ORDER BY a.id DESC`); res.json(r.rows); });
app.get('/api/acceptances/:id', authRequired, async (req,res)=>{ const r=await pool.query(`SELECT * FROM acceptances WHERE id=$1`, [req.params.id]); if(!r.rows.length) return res.status(404).json({error:'not found'}); res.json(r.rows[0]); });
app.post('/api/acceptances', authRequired, adminRequired, async (req,res)=>{ const {client_id,contact_person,contact_phone,address,content,note,contact_job_title,customer_tax_id}=req.body; const r=await pool.query(`INSERT INTO acceptances (client_id,contact_person,contact_phone,address,content,note,contact_job_title,customer_tax_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [client_id||null,contact_person||'',contact_phone||'',address||'',content||'',note||'',contact_job_title||'',customer_tax_id||'']); res.json(r.rows[0]); });
app.put('/api/acceptances/:id', authRequired, adminRequired, async (req,res)=>{ const {client_id,contact_person,contact_phone,address,content,note,contact_job_title,customer_tax_id}=req.body; const r=await pool.query(`UPDATE acceptances SET client_id=$1,contact_person=$2,contact_phone=$3,address=$4,content=$5,note=$6,contact_job_title=$7,customer_tax_id=$8 WHERE id=$9 RETURNING *`, [client_id||null,contact_person||'',contact_phone||'',address||'',content||'',note||'',contact_job_title||'',customer_tax_id||'',req.params.id]); res.json(r.rows[0]); });

app.get('/', (req,res)=>res.sendFile(path.join(__dirname,'public','login.html')));
const port=process.env.PORT||3000;
initDb().then(()=>app.listen(port,()=>console.log('Server running on port '+port))).catch(err=>{ console.error(err); process.exit(1); });
