
document.getElementById('app').innerHTML = layout('合約歷史', `<div class="list-panel"><div class="toolbar"><input id="search" placeholder="輸入客戶 / 合約名稱查詢"></div><div id="list"></div></div>`);
let rows=[]; async function load(){ rows=await API.listContracts(); render(); }
function render(){ const k=search.value.trim().toLowerCase(); const result=rows.filter(r=>`${r.client_name||''} ${r.contract_name||''}`.toLowerCase().includes(k)||!k); list.innerHTML=result.length?result.map(r=>`<div class="list-item"><strong>${r.contract_name||'未命名合約'}</strong><div>客戶：${r.client_name||'—'}</div><div>金額：NT$ ${money(r.amount||0)}</div><div>建立時間：${r.created_at||'—'}</div><div class="toolbar" style="margin-top:10px;margin-bottom:0;"><a class="btn" href="/contracts.html?id=${r.id}">修改</a></div></div>`).join(''):'<div class="muted">目前尚無合約歷史資料。</div>'; }
search.addEventListener('input', render); load().catch(err=>alert(err.message));
