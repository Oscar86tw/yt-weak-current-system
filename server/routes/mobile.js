import express from 'express';

const router = express.Router();

router.get('/', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>手機收款頁</title>
  <style>
    body{font-family:Arial,sans-serif;max-width:640px;margin:30px auto;padding:16px}
    select,input,button{width:100%;padding:12px;margin:8px 0;font-size:16px}
    .card{border:1px solid #ddd;border-radius:12px;padding:16px}
  </style>
</head>
<body>
  <div class="card">
    <h2>現場收款</h2>
    <select id="quote"></select>
    <input id="amount" type="number" placeholder="輸入金額" />
    <input id="transactionId" placeholder="交易編號（自訂）" />
    <button onclick="submitPay()">送出收款</button>
    <pre id="result"></pre>
  </div>
  <script>
    async function loadQuotes(){
      const res = await fetch('/api/payment/quotes');
      const data = await res.json();
      document.getElementById('quote').innerHTML = data.map(q =>
        '<option value="'+ q.quote_no +'">'+ q.quote_no +'｜'+ q.project_name +'</option>'
      ).join('');
    }
    async function submitPay(){
      const orderId = document.getElementById('quote').value;
      const amount = Number(document.getElementById('amount').value || 0);
      const transactionId = document.getElementById('transactionId').value || ('M' + Date.now());
      const res = await fetch('/api/webhook/linepay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, amount, transactionId })
      });
      const json = await res.json();
      document.getElementById('result').textContent = JSON.stringify(json, null, 2);
    }
    loadQuotes();
  </script>
</body>
</html>`);
});

export default router;
