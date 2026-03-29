const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});
const db = new sqlite3.Database('./data.db');

// 建表
db.run(`
CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer TEXT,
  project TEXT,
  amount INTEGER,
  date TEXT
)
`);

// 新增報價
app.post('/api/quote', (req, res) => {
  const { customer, project, amount, date } = req.body;
  db.run(
    "INSERT INTO quotes (customer, project, amount, date) VALUES (?, ?, ?, ?)",
    [customer, project, amount, date],
    function(err) {
      if (err) return res.send(err);
      res.send({ id: this.lastID });
    }
  );
});

// 取得全部報價
app.get('/api/quote', (req, res) => {
  db.all("SELECT * FROM quotes", (err, rows) => {
    res.send(rows);
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
