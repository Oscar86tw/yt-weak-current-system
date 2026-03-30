# 昱拓弱電公司系統 V6 完整版

這是完整可部署版本，不是補丁包。

## 已完成
1. 第一層主功能選單改綠色，第二層改橙色
2. 文件編號
   - 報價單：YA + YYYYMMDD + 當日三碼流水號
   - 維護合約單：YB + YYYYMMDD + 當日三碼流水號
   - 驗收單：YC + YYYYMMDD + 當日三碼流水號
3. 設備模組
4. 報價單追蹤模組
5. 查詢頁刪除確認
6. 管理者 / 檢視者帳戶權限
7. 真正附 PDF 檔寄 MAIL
   - 需設定 SMTP 環境變數

## SMTP 環境變數
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS
- SMTP_SECURE
- MAIL_FROM

## 預設管理者
- adminoscar
- admin0960770512

## Render 必要環境變數
- DATABASE_URL
- ADMIN_USER
- ADMIN_PASS

## Render 若要啟用寄信，再補：
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS
- SMTP_SECURE
- MAIL_FROM