document.getElementById('app').innerHTML = `
<h2>報價單追蹤</h2>
<div id="list"></div>
`;

/*
追蹤欄位：
- 簽核狀況：尚未簽核 / 同意施作 / 先換待核
- 進度：待安排 / 進行中 / 已完成

此模組應直接讀 quotes 資料表：
quote_no, quote_date, client_name, project_name, total, sign_status, progress

並依月份分組顯示。
*/