# yt-v316-final

本專案是可本地 Docker 一鍵部署的收款系統骨架，包含：

- Webhook 收款事件入口
- BullMQ + Redis 佇列
- Worker 非同步處理
- PostgreSQL 寫入收據與付款
- LINE Messaging API 推送訊息（需自行填入 token）
- 簡易手機收款頁

## 本地啟動

```bash
docker compose up -d --build
```

## 測試 webhook

```bash
curl -X POST http://localhost:10000/api/webhook/linepay \
  -H "Content-Type: application/json" \
  -d '{"orderId":"YA001","amount":20000,"transactionId":"TX001"}'
```

## 驗證
- API： http://localhost:10000/health
- 手機頁： http://localhost:10000/mobile/
