
document.getElementById('app').innerHTML = layout('驗收歷史', `
<div class="list-panel">
  <div class="toolbar"><input id="search" placeholder="輸入客戶 / 聯絡人查詢"></div>
  <div id="list"></div>
</div>`);
let rows = [];
async function load(){ rows = await API.listAcceptances(); render(); }
function render(){ const k = search.value.trim().toLowerCase(); const result = rows.filter(r => `${r.client_name||''} ${r.contact_person||''}`.toLowerCase().includes(k) || !k); list.innerHTML = result.length ? result.map(r=>`<div class="list-item"><strong>${r.client_name||'未指定客戶'}</strong><div>聯絡人：${r.contact_person||'—'}</div><div>電話：${r.contact_phone||'—'}</div><div>建立時間：${r.created_at||'—'}</div><div class="toolbar" style="margin-top:10px;margin-bottom:0;"><a class="btn" href="/acceptance.html?id=${r.id}">修改</a></div></div>`).join('') : '<div class="muted">目前尚無驗收歷史資料。</div>'; }
search.addEventListener('input', render); load().catch(err=>alert(err.message));
