# yt-v316-render-free

這是給 Render 免費版用的簡化部署包。

## 為什麼這版和 Docker 版不同
Render 免費 Web Service 會在閒置 15 分鐘後休眠，而且免費 Web Service 適合單一服務；背景 worker 並沒有免費 instance type，所以這版改成：
- 單一 Web Service
- 直接在 webhook 請求中完成付款處理
- 外部 PostgreSQL 用 `DB_URL`
- LINE 推播仍可用

## 建議資料庫
- 可用任何 PostgreSQL
- 若用 Render 免費 Postgres，要注意免費資料庫有到期限制

## 部署步驟
1. 把這份專案推到 GitHub
2. 到 Render 建立 Blueprint，選這個 repo
3. 填入環境變數：
   - `DB_URL`
   - `LINE_TOKEN`
4. 部署完成後，測：
   - `/health`
   - `/mobile`

## 測試 webhook
```bash
curl -X POST https://你的-render-網址/api/webhook/linepay \
  -H "Content-Type: application/json" \
  -d '{"orderId":"YA001","amount":20000,"transactionId":"TX001"}'
```
