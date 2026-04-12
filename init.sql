CREATE TABLE IF NOT EXISTS quotes (
  id SERIAL PRIMARY KEY,
  quote_no TEXT UNIQUE NOT NULL,
  project_name TEXT NOT NULL,
  total INTEGER DEFAULT 0,
  paid INTEGER DEFAULT 0,
  client_name TEXT,
  line_user_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receipts (
  id SERIAL PRIMARY KEY,
  receipt_no TEXT UNIQUE NOT NULL,
  quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
  amount_received INTEGER NOT NULL,
  auto_match BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  transaction_id TEXT UNIQUE NOT NULL,
  order_id TEXT,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'received',
  raw_payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  event TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO quotes (quote_no, project_name, total, paid, client_name, line_user_id)
VALUES
  ('YA001', 'A棟監視系統', 50000, 0, 'A社區', NULL),
  ('YA002', 'B棟門禁工程', 30000, 0, 'B社區', NULL)
ON CONFLICT (quote_no) DO NOTHING;
