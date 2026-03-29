
document.getElementById('app').innerHTML = layout('報價查詢', `<div class="list-panel"><div class="toolbar"><input id="quoteSearch" placeholder="輸入客戶 / 工程 / 報價單號查詢"></div><div id="quoteList"></div></div>`);
let rows=[]; async function load(){ rows=await API.listQuotes(); render(); }
function render(){ const k=quoteSearch.value.trim().toLowerCase(); const list=rows.filter(q=>`${q.quote_no||''} ${q.client_name||''} ${q.project_name||''}`.toLowerCase().includes(k)||!k); quoteList.innerHTML=list.length?list.map(q=>`<div class="list-item"><strong>${q.quote_no||'未編號'}｜${q.project_name||'未命名工程'}</strong><div>客戶：${q.client_name||'—'}</div><div>日期：${q.quote_date||'—'}</div><div>合計：NT$ ${money(q.total||0)}</div><div class="toolbar" style="margin-top:10px;margin-bottom:0;"><a class="btn" href="/quote.html?id=${q.id}">修改</a></div></div>`).join(''):'<div class="muted">目前尚無報價資料。</div>'; }
quoteSearch.addEventListener('input', render); load().catch(err=>alert(err.message));
