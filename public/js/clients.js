
document.getElementById('app').innerHTML = layout('客戶資料管理', `
<div class="split">
  <div class="form-panel">
    <h2 style="margin-top:0;">客戶資料表單 <span class="badge" id="clientMode">新增</span></h2>
    <input type="hidden" id="clientId">
    <label>客戶名稱</label><input id="clientName" placeholder="請輸入客戶名稱">
    <div class="row"><div><label>統一編號</label><input id="clientTaxId"></div><div><label>聯絡電話</label><input id="clientPhone"></div></div>
    <div class="row"><div><label>聯絡人</label><input id="clientContact"></div><div><label>職位</label><input id="clientJobTitle"></div></div>
    <label>通訊地址</label><textarea id="clientAddress"></textarea>
    <div class="toolbar"><button id="saveClientBtn">存檔</button><button class="light" id="clearClientBtn">清空欄位</button></div>
  </div>
  <div class="list-panel"><div class="toolbar"><input id="clientSearch" placeholder="輸入客戶名稱 / 聯絡人 / 電話查詢"></div><div id="clientList"></div></div>
</div>`);
let clientRows = [];
async function loadClients(){ clientRows = await API.getClients(); renderClientList(); }
function clearClientForm(){ ['clientId','clientName','clientTaxId','clientPhone','clientContact','clientJobTitle','clientAddress'].forEach(id=>document.getElementById(id).value=''); clientMode.textContent='新增'; }
function fillClientForm(row){ clientId.value=row.id||''; clientName.value=row.client_name||''; clientTaxId.value=row.tax_id||''; clientPhone.value=row.phone||''; clientContact.value=row.contact_person||''; clientJobTitle.value=row.job_title||''; clientAddress.value=row.address||''; clientMode.textContent='修改'; window.scrollTo({top:0,behavior:'smooth'}); }
function renderClientList(){ const k=clientSearch.value.trim().toLowerCase(); const rows=clientRows.filter(c=>`${c.client_name||''} ${c.contact_person||''} ${c.phone||''} ${c.address||''} ${c.job_title||''} ${c.tax_id||''}`.toLowerCase().includes(k)||!k); clientList.innerHTML = rows.length ? rows.map(c=>`<div class="list-item"><strong>${c.client_name}</strong><div>統編：${c.tax_id||'—'}</div><div>聯絡人：${c.contact_person||'—'}　職位：${c.job_title||'—'}</div><div>電話：${c.phone||'—'}</div><div>地址：${c.address||'—'}</div><div class="toolbar" style="margin-top:10px;margin-bottom:0;"><button onclick="editClient(${c.id})">修改</button><a class="btn light" href="/quote.html?clientId=${c.id}">帶入報價單</a><button class="danger" onclick="removeClient(${c.id})">刪除</button></div></div>`).join('') : '<div class="muted">目前尚無客戶資料。</div>'; }
function editClient(id){ const row=clientRows.find(x=>x.id===id); if(row) fillClientForm(row); }
async function saveClient(){ const payload={client_name:clientName.value.trim(),tax_id:clientTaxId.value.trim(),contact_person:clientContact.value.trim(),phone:clientPhone.value.trim(),address:clientAddress.value.trim(),job_title:clientJobTitle.value.trim()}; if(!payload.client_name){ alert('請先輸入客戶名稱。'); return; } if(clientId.value){ await API.updateClient(clientId.value, payload); alert('客戶資料已更新。'); } else { await API.createClient(payload); alert('客戶資料已建立。'); } clearClientForm(); await loadClients(); }
async function removeClient(id){ if(!confirm('確定刪除此客戶資料嗎？')) return; await API.deleteClient(id); await loadClients(); }
saveClientBtn.addEventListener('click', saveClient); clearClientBtn.addEventListener('click', clearClientForm); clientSearch.addEventListener('input', renderClientList); loadClients().catch(err=>alert(err.message));
