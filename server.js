
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

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

process.on('uncaughtException', err => console.error('uncaughtException:', err));
process.on('unhandledRejection', err => console.error('unhandledRejection:', err));

function hashPwd(s){ return crypto.createHash('sha256').update(String(s)).digest('hex'); }
function ymdKey(){ const d=new Date(); return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`; }

async function nextDocNo(type){
  const map = { quote:'YA', contract:'YB', acceptance:'YC' };
  const prefix = map[type] || 'YA';
  const dateKey = ymdKey();
  const table = type === 'quote' ? 'quotes' : type === 'contract' ? 'contracts' : 'acceptances';
  const column = type === 'quote' ? 'quote_no' : 'doc_no';
  const r = await pool.query(`SELECT ${column} AS doc_no FROM ${table} WHERE ${column} LIKE $1 ORDER BY id DESC LIMIT 1`, [`${prefix}${dateKey}%`]);
  let next = 1;
  if(r.rows.length && r.rows[0].doc_no) next = Number(String(r.rows[0].doc_no).slice(-3)) + 1;
  return `${prefix}${dateKey}${String(next).padStart(3,'0')}`;
}

async function initDb(){
  await pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('admin','viewer')), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS clients (id SERIAL PRIMARY KEY, client_name TEXT NOT NULL, tax_id TEXT, contact_person TEXT, phone TEXT, address TEXT, job_title TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS quotes (id SERIAL PRIMARY KEY, quote_no TEXT, quote_date TEXT, client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL, project_name TEXT NOT NULL, subtotal INTEGER DEFAULT 0, tax INTEGER DEFAULT 0, total INTEGER DEFAULT 0, quote_desc TEXT, quote_terms TEXT, sign_status TEXT DEFAULT '尚未簽核', progress TEXT DEFAULT '待安排', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS quote_items (id SERIAL PRIMARY KEY, quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE, item_order INTEGER, item_desc TEXT, qty INTEGER DEFAULT 0, unit_price INTEGER DEFAULT 0, item_total INTEGER DEFAULT 0)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS contracts (id SERIAL PRIMARY KEY, doc_no TEXT, doc_date TEXT, client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL, contract_name TEXT, contact_person TEXT, contact_phone TEXT, address TEXT, scope TEXT, frequency TEXT, amount INTEGER DEFAULT 0, terms TEXT, contact_job_title TEXT, customer_tax_id TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS acceptances (id SERIAL PRIMARY KEY, doc_no TEXT, doc_date TEXT, client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL, contact_person TEXT, contact_phone TEXT, address TEXT, content TEXT, note TEXT, contact_job_title TEXT, customer_tax_id TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS equipment (id SERIAL PRIMARY KEY, code TEXT, name TEXT NOT NULL, spec TEXT, cost INTEGER DEFAULT 0, price INTEGER DEFAULT 0, profit INTEGER DEFAULT 0, note TEXT, link TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  const admin = await pool.query(`SELECT id FROM users WHERE username=$1`, [ADMIN_USER]);
  if(!admin.rows.length){
    await pool.query(`INSERT INTO users (username,password_hash,role) VALUES ($1,$2,'admin')`, [ADMIN_USER, hashPwd(ADMIN_PASS)]);
  }
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

function smtpReady(){
  return !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM);
}
function createMailer(){
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}
function buildPdfBuffer({ documentType, payload }){
  return new Promise((resolve, reject) => {
    try{
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.fontSize(18).text(payload.company?.name || '');
      doc.moveDown(0.3);
      doc.fontSize(10).text(payload.company?.tag || '');
      doc.text(`電話：${payload.company?.phone || ''}`);
      doc.text(`地址：${payload.company?.address || ''}`);
      doc.moveDown();
      const titleMap = { quote:'工程報價單', contract:'維護合約單', acceptance:'驗收單' };
      doc.fontSize(16).text(titleMap[documentType] || '文件', { align:'right' });
      doc.moveDown();
      Object.entries(payload.header || {}).forEach(([k,v]) => doc.fontSize(10).text(`${k}: ${v || ''}`));
      doc.moveDown();
      if(documentType === 'quote'){
        doc.fontSize(12).text('工程內容與費用');
        (payload.body?.items || []).forEach((item, idx) => {
          doc.fontSize(10).text(`${idx+1}. ${item.desc || ''} / 數量:${item.qty || ''} / 單價:${item.price || ''}`);
        });
        doc.moveDown();
        doc.fontSize(12).text('施工 / 查修說明');
        doc.fontSize(10).text(payload.body?.quoteDesc || '');
        doc.moveDown();
        doc.fontSize(12).text('報價條款');
        doc.fontSize(10).text(payload.body?.quoteTerms || '');
      }
      if(documentType === 'contract'){
        doc.fontSize(12).text('服務範圍');
        doc.fontSize(10).text(payload.body?.scope || '');
        doc.moveDown();
        doc.text(`巡檢頻率：${payload.body?.frequency || ''}`);
        doc.text(`合約金額：${payload.body?.amount || ''}`);
        doc.moveDown();
        doc.fontSize(12).text('合約條款');
        doc.fontSize(10).text(payload.body?.terms || '');
      }
      if(documentType === 'acceptance'){
        doc.fontSize(12).text('驗收項目');
        doc.fontSize(10).text(payload.body?.content || '');
        doc.moveDown();
        doc.fontSize(12).text('備註');
        doc.fontSize(10).text(payload.body?.note || '');
      }
      doc.end();
    } catch(err){ reject(err); }
  });
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

app.get('/api/users', authRequired, adminRequired, async (req,res) => {
  const r = await pool.query(`SELECT id,username,role,created_at FROM users ORDER BY id DESC`);
  res.json(r.rows);
});
app.post('/api/users', authRequired, adminRequired, async (req,res) => {
  const { username, password, role } = req.body;
  if(!username || !password) return res.status(400).json({ error:'username and password required' });
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

app.get('/api/clients', authRequired, async (req,res) => {
  const r = await pool.query(`SELECT * FROM clients ORDER BY id DESC`);
  res.json(r.rows);
});
app.post('/api/clients', authRequired, adminRequired, async (req,res) => {
  const { client_name, tax_id, contact_person, phone, address, job_title } = req.body;
  const r = await pool.query(`INSERT INTO clients (client_name,tax_id,contact_person,phone,address,job_title) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [client_name, tax_id || '', contact_person || '', phone || '', address || '', job_title || '']);
  res.json(r.rows[0]);
});
app.put('/api/clients/:id', authRequired, adminRequired, async (req,res) => {
  const { client_name, tax_id, contact_person, phone, address, job_title } = req.body;
  const r = await pool.query(`UPDATE clients SET client_name=$1,tax_id=$2,contact_person=$3,phone=$4,address=$5,job_title=$6 WHERE id=$7 RETURNING *`, [client_name || '', tax_id || '', contact_person || '', phone || '', address || '', job_title || '', req.params.id]);
  res.json(r.rows[0]);
});
app.delete('/api/clients/:id', authRequired, adminRequired, async (req,res) => {
  await pool.query(`DELETE FROM clients WHERE id=$1`, [req.params.id]);
  res.json({ ok:true });
});

app.get('/api/serials/next', authRequired, async (req,res) => {
  res.json({ doc_no: await nextDocNo(req.query.type || 'quote') });
});

app.get('/api/quotes', authRequired, async (req,res) => {
  const r = await pool.query(`SELECT q.*, c.client_name FROM quotes q LEFT JOIN clients c ON c.id=q.client_id ORDER BY q.id DESC`);
  res.json(r.rows);
});
app.get('/api/quotes/:id', authRequired, async (req,res) => {
  const q = await pool.query(`SELECT * FROM quotes WHERE id=$1`, [req.params.id]);
  if(!q.rows.length) return res.status(404).json({ error:'not found' });
  const i = await pool.query(`SELECT * FROM quote_items WHERE quote_id=$1 ORDER BY item_order ASC,id ASC`, [req.params.id]);
  res.json({ ...q.rows[0], items: i.rows });
});
async function saveQuoteCore(id, body){
  const { quote_no, quote_date, client_id, project_name, quote_desc, quote_terms, items=[] } = body;
  const subtotal = items.reduce((s,i)=>s+(Number(i.qty||0)*Number(i.unit_price||0)),0);
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;
  let q;
  if(id){
    const r = await pool.query(`UPDATE quotes SET quote_no=$1,quote_date=$2,client_id=$3,project_name=$4,subtotal=$5,tax=$6,total=$7,quote_desc=$8,quote_terms=$9 WHERE id=$10 RETURNING *`, [quote_no || '', quote_date || '', client_id || null, project_name || '', subtotal, tax, total, quote_desc || '', quote_terms || '', id]);
    q = r.rows[0];
    await pool.query(`DELETE FROM quote_items WHERE quote_id=$1`, [id]);
  } else {
    const r = await pool.query(`INSERT INTO quotes (quote_no,quote_date,client_id,project_name,subtotal,tax,total,quote_desc,quote_terms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [quote_no || '', quote_date || '', client_id || null, project_name || '', subtotal, tax, total, quote_desc || '', quote_terms || '']);
    q = r.rows[0];
  }
  for(const item of items){
    const qty = Number(item.qty || 0), unitPrice = Number(item.unit_price || 0), itemTotal = qty * unitPrice;
    await pool.query(`INSERT INTO quote_items (quote_id,item_order,item_desc,qty,unit_price,item_total) VALUES ($1,$2,$3,$4,$5,$6)`, [q.id, item.item_order || 0, item.item_desc || '', qty, unitPrice, itemTotal]);
  }
  return q;
}
app.post('/api/quotes', authRequired, adminRequired, async (req,res) => {
  const q = await saveQuoteCore(null, req.body);
  res.json({ ok:true, quote_id:q.id });
});
app.put('/api/quotes/:id', authRequired, adminRequired, async (req,res) => {
  const q = await saveQuoteCore(req.params.id, req.body);
  res.json({ ok:true, quote_id:q.id });
});
app.delete('/api/quotes/:id', authRequired, adminRequired, async (req,res) => {
  await pool.query(`DELETE FROM quotes WHERE id=$1`, [req.params.id]);
  res.json({ ok:true });
});

app.get('/api/quote-tracking', authRequired, async (req,res) => {
  const r = await pool.query(`SELECT q.id,q.quote_no,q.quote_date,q.project_name,q.total,q.sign_status,q.progress,c.client_name FROM quotes q LEFT JOIN clients c ON c.id=q.client_id ORDER BY q.quote_date DESC NULLS LAST,q.id DESC`);
  res.json(r.rows);
});
app.put('/api/quote-tracking/:id', authRequired, adminRequired, async (req,res) => {
  const { sign_status, progress } = req.body;
  const r = await pool.query(`UPDATE quotes SET sign_status=$1,progress=$2 WHERE id=$3 RETURNING *`, [sign_status || '尚未簽核', progress || '待安排', req.params.id]);
  res.json(r.rows[0]);
});

app.get('/api/contracts', authRequired, async (req,res) => {
  const r = await pool.query(`SELECT t.*, c.client_name FROM contracts t LEFT JOIN clients c ON c.id=t.client_id ORDER BY t.id DESC`);
  res.json(r.rows);
});
app.get('/api/contracts/:id', authRequired, async (req,res) => {
  const r = await pool.query(`SELECT * FROM contracts WHERE id=$1`, [req.params.id]);
  if(!r.rows.length) return res.status(404).json({ error:'not found' });
  res.json(r.rows[0]);
});
app.post('/api/contracts', authRequired, adminRequired, async (req,res) => {
  const { doc_no, doc_date, client_id, contract_name, contact_person, contact_phone, address, scope, frequency, amount, terms, contact_job_title, customer_tax_id } = req.body;
  const r = await pool.query(`INSERT INTO contracts (doc_no,doc_date,client_id,contract_name,contact_person,contact_phone,address,scope,frequency,amount,terms,contact_job_title,customer_tax_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`, [doc_no || '', doc_date || '', client_id || null, contract_name || '', contact_person || '', contact_phone || '', address || '', scope || '', frequency || '', Number(amount || 0), terms || '', contact_job_title || '', customer_tax_id || '']);
  res.json(r.rows[0]);
});
app.put('/api/contracts/:id', authRequired, adminRequired, async (req,res) => {
  const { doc_no, doc_date, client_id, contract_name, contact_person, contact_phone, address, scope, frequency, amount, terms, contact_job_title, customer_tax_id } = req.body;
  const r = await pool.query(`UPDATE contracts SET doc_no=$1,doc_date=$2,client_id=$3,contract_name=$4,contact_person=$5,contact_phone=$6,address=$7,scope=$8,frequency=$9,amount=$10,terms=$11,contact_job_title=$12,customer_tax_id=$13 WHERE id=$14 RETURNING *`, [doc_no || '', doc_date || '', client_id || null, contract_name || '', contact_person || '', contact_phone || '', address || '', scope || '', frequency || '', Number(amount || 0), terms || '', contact_job_title || '', customer_tax_id || '', req.params.id]);
  res.json(r.rows[0]);
});
app.delete('/api/contracts/:id', authRequired, adminRequired, async (req,res) => {
  await pool.query(`DELETE FROM contracts WHERE id=$1`, [req.params.id]);
  res.json({ ok:true });
});

app.get('/api/acceptances', authRequired, async (req,res) => {
  const r = await pool.query(`SELECT a.*, c.client_name FROM acceptances a LEFT JOIN clients c ON c.id=a.client_id ORDER BY a.id DESC`);
  res.json(r.rows);
});
app.get('/api/acceptances/:id', authRequired, async (req,res) => {
  const r = await pool.query(`SELECT * FROM acceptances WHERE id=$1`, [req.params.id]);
  if(!r.rows.length) return res.status(404).json({ error:'not found' });
  res.json(r.rows[0]);
});
app.post('/api/acceptances', authRequired, adminRequired, async (req,res) => {
  const { doc_no, doc_date, client_id, contact_person, contact_phone, address, content, note, contact_job_title, customer_tax_id } = req.body;
  const r = await pool.query(`INSERT INTO acceptances (doc_no,doc_date,client_id,contact_person,contact_phone,address,content,note,contact_job_title,customer_tax_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [doc_no || '', doc_date || '', client_id || null, contact_person || '', contact_phone || '', address || '', content || '', note || '', contact_job_title || '', customer_tax_id || '']);
  res.json(r.rows[0]);
});
app.put('/api/acceptances/:id', authRequired, adminRequired, async (req,res) => {
  const { doc_no, doc_date, client_id, contact_person, contact_phone, address, content, note, contact_job_title, customer_tax_id } = req.body;
  const r = await pool.query(`UPDATE acceptances SET doc_no=$1,doc_date=$2,client_id=$3,contact_person=$4,contact_phone=$5,address=$6,content=$7,note=$8,contact_job_title=$9,customer_tax_id=$10 WHERE id=$11 RETURNING *`, [doc_no || '', doc_date || '', client_id || null, contact_person || '', contact_phone || '', address || '', content || '', note || '', contact_job_title || '', customer_tax_id || '', req.params.id]);
  res.json(r.rows[0]);
});
app.delete('/api/acceptances/:id', authRequired, adminRequired, async (req,res) => {
  await pool.query(`DELETE FROM acceptances WHERE id=$1`, [req.params.id]);
  res.json({ ok:true });
});

app.get('/api/equipment', authRequired, async (req,res) => {
  const r = await pool.query(`SELECT * FROM equipment ORDER BY id DESC`);
  res.json(r.rows);
});
app.post('/api/equipment', authRequired, adminRequired, async (req,res) => {
  const { code, name, spec, cost, price, note, link } = req.body;
  const profit = Number(price || 0) - Number(cost || 0);
  const r = await pool.query(`INSERT INTO equipment (code,name,spec,cost,price,profit,note,link) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [code || '', name || '', spec || '', Number(cost || 0), Number(price || 0), profit, note || '', link || '']);
  res.json(r.rows[0]);
});
app.put('/api/equipment/:id', authRequired, adminRequired, async (req,res) => {
  const { code, name, spec, cost, price, note, link } = req.body;
  const profit = Number(price || 0) - Number(cost || 0);
  const r = await pool.query(`UPDATE equipment SET code=$1,name=$2,spec=$3,cost=$4,price=$5,profit=$6,note=$7,link=$8 WHERE id=$9 RETURNING *`, [code || '', name || '', spec || '', Number(cost || 0), Number(price || 0), profit, note || '', link || '', req.params.id]);
  res.json(r.rows[0]);
});
app.delete('/api/equipment/:id', authRequired, adminRequired, async (req,res) => {
  await pool.query(`DELETE FROM equipment WHERE id=$1`, [req.params.id]);
  res.json({ ok:true });
});

app.post('/api/send-pdf-mail', authRequired, adminRequired, async (req,res) => {
  if(!smtpReady()) return res.status(400).json({ ok:false, error:'尚未設定 SMTP 環境變數' });
  const { to, subject, memo, documentType, payload } = req.body;
  if(!to) return res.status(400).json({ ok:false, error:'缺少收件者 email' });
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks = [];
  doc.on('data', c => chunks.push(c));
  const done = new Promise(resolve => doc.on('end', ()=>resolve(Buffer.concat(chunks))));
  doc.fontSize(18).text(payload.company?.name || '');
  doc.moveDown(0.3);
  doc.fontSize(10).text(payload.company?.tag || '');
  doc.text(`電話：${payload.company?.phone || ''}`);
  doc.text(`地址：${payload.company?.address || ''}`);
  doc.moveDown();
  const titleMap = { quote:'工程報價單', contract:'維護合約單', acceptance:'驗收單' };
  doc.fontSize(16).text(titleMap[documentType] || '文件', { align:'right' });
  doc.moveDown();
  Object.entries(payload.header || {}).forEach(([k,v]) => doc.fontSize(10).text(`${k}: ${v || ''}`));
  doc.moveDown();
  doc.fontSize(10).text(JSON.stringify(payload.body || {}, null, 2));
  doc.end();
  const pdf = await done;

  const transporter = createMailer();
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: subject || '文件寄送',
    text: `${memo || ''}\n\n請查收附件 PDF。`,
    attachments: [{ filename: `${documentType}-${payload?.header?.docNo || 'document'}.pdf`, content: pdf, contentType: 'application/pdf' }]
  });
  res.json({ ok:true });
});

app.get('/', (req,res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

const port = process.env.PORT || 3000;
initDb()
  .then(() => app.listen(port, '0.0.0.0', () => console.log('Server running on port ' + port)))
  .catch(err => {
    console.error('Startup error:', err);
    process.exit(1);
  });
