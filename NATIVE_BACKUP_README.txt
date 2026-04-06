V3.14.4 原生資料庫備份版

一、用途
1. 使用 PostgreSQL 原生工具 pg_dump 匯出整庫 SQL 備份
2. 使用 psql 匯入整庫 SQL 備份

二、注意
1. 伺服器必須安裝 pg_dump 與 psql
2. 若部署在 Render，執行環境不一定內建這兩個工具
3. 若環境不可用，請改用系統內建「完整 JSON 備份」
4. 還原原生 SQL 會影響整個資料庫，操作前請先做備份

三、已提供
1. 後端 API：
   /api/system/backup/native/check
   /api/system/backup/native/export
   /api/system/backup/native/import

2. 本機維護腳本：
   scripts/native_backup.sh
   scripts/native_restore.sh
