import 'dotenv/config';
import express from 'express';
import webhookRoute from './routes/webhook.js';
import mobileRoute from './routes/mobile.js';
import paymentRoute from './routes/payment.js';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'yt-v316-render-free' });
});

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    message: 'yt-v316-render-free running',
    health: '/health',
    mobile: '/mobile'
  });
});

app.use('/api/webhook', webhookRoute);
app.use('/api/payment', paymentRoute);
app.use('/mobile', mobileRoute);

const port = Number(process.env.PORT || 10000);
app.listen(port, () => {
  console.log(`Render free app running on :${port}`);
});
