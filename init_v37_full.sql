-- 昱拓弱電系統 V3.7 全功能一鍵重建 SQL
DROP TABLE IF EXISTS purchase_items CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS quote_items CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS acceptances CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS equipment_categories CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','viewer')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  client_name TEXT NOT NULL,
  tax_id TEXT,
  contact_person TEXT,
  phone TEXT,
  address TEXT,
  job_title TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE suppliers (
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
);

CREATE TABLE equipment_categories (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE equipment (
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
);

CREATE TABLE quotes (
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
);

CREATE TABLE quote_items (
  id SERIAL PRIMARY KEY,
  quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
  item_order INTEGER,
  item_desc TEXT,
  spec TEXT,
  equipment_id INTEGER REFERENCES equipment(id) ON DELETE SET NULL,
  qty INTEGER DEFAULT 0,
  unit_price INTEGER DEFAULT 0,
  item_total INTEGER DEFAULT 0
);

CREATE TABLE contracts (
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
);

CREATE TABLE acceptances (
  id SERIAL PRIMARY KEY,
  doc_no TEXT,
  doc_date TEXT,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  content TEXT,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchases (
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
);

CREATE TABLE purchase_items (
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
);

CREATE TABLE system_settings (
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
);

INSERT INTO system_settings (
  id, company_name, company_tag, company_phone, company_address,
  quote_prefix, contract_prefix, acceptance_prefix, purchase_prefix, equipment_prefix, serial_digits
) VALUES (
  1, '昱拓弱電有限公司', '弱電系統維修｜監控｜門禁｜對講｜車道停管｜BA中央監控',
  '0960-770-512', '桃園市中壢區榮安一街490號13樓',
  'YA', 'YB', 'YC', 'PI', 'EQ', 3
);

-- 預設管理者：adminoscar / admin0960770512
INSERT INTO users (username, password_hash, role)
VALUES ('adminoscar', 'adf40cf8be9b0f3890d31ad4b073d9f0be61bcd617ddb34f26788b6ca654a5a6', 'admin');

CREATE INDEX idx_quotes_quote_date ON quotes(quote_date);
CREATE INDEX idx_quotes_client_id ON quotes(client_id);
CREATE INDEX idx_quotes_sign_status ON quotes(sign_status);
CREATE INDEX idx_quotes_progress ON quotes(progress);
CREATE INDEX idx_purchases_purchase_date ON purchases(purchase_date);
CREATE INDEX idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX idx_purchases_payment_status ON purchases(payment_status);
CREATE INDEX idx_equipment_category ON equipment(category);