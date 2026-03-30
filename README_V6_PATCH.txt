昱拓弱電系統 V6 修改包

本包提供你這次指定的升級重點與可直接覆蓋的核心檔案：
1. 第一層主功能選單改綠色，第二層改橙色
2. 文件編號規則：
   - 報價單 YA + YYYYMMDD + 3碼流水號
   - 維護合約單 YB + YYYYMMDD + 3碼流水號
   - 驗收單 YC + YYYYMMDD + 3碼流水號
   - 每日重新從 001 開始
3. 新增設備模組
4. 新增報價單追蹤模組
5. 保留「真正附 PDF 寄信」的 API 介面說明

覆蓋建議：
- public/css/style.css
- public/js/common.js
- public/js/equipment.js
- public/js/quote_tracking.js
- server.js

注意：
真正「附 PDF 檔寄信」仍需再串接郵件服務（例如 Resend / SendGrid / SMTP）與 PDF 產生器。
本包先把結構、編號邏輯、設備與報價追蹤補上。