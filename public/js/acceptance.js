
document.getElementById('app').innerHTML = layout('驗收單', `
<div class="split">
  <div class="form-panel">
    <h2 style="margin-top:0;">驗收單表單 <span class="badge" id="acceptanceMode">新增</span></h2>
    <input type="hidden" id="acceptanceId">
    <label>客戶搜尋</label><input id="customerSearch" placeholder="輸入客戶名稱關鍵字快速篩選">
    <label>客戶名稱（下拉選單）</label><select id="customerSelect"></select>
    <div class="row">
      <div><label>客戶統編</label><input id="customerTaxId" readonly></div>
      <div><label>聯絡人</label><input id="contactPerson"></div>
    </div>
    <div class="row">
      <div><label>聯絡電話</label><input id="contactPhone"></div>
      <div><label>職位</label><input id="contactJobTitle"></div>
    </div>
    <label>通訊地址</label><textarea id="customerAddress"></textarea>
    <label>完成項目</label><textarea id="acceptanceContent">1. 設備安裝完成。
2. 線路整理完成。
3. 系統測試正常。
4. 基本操作說明完成。</textarea>
    <label>備註</label><textarea id="acceptanceNote">如後續發現非本次施工範圍之既有設備異常，將另行檢測與報價。</textarea>
    <div class="toolbar"><button id="saveAcceptanceBtn">存檔</button><button class="secondary" onclick="window.print()">一鍵匯出 PDF</button></div>
  </div>
  <div class="preview-panel" id="acceptancePreview"></div>
</div>`);
let clients = [], filteredClients = [];
function renderCustomerSelect(list){ customerSelect.innerHTML = '<option value="">請選擇客戶</option>' + list.map(c=>`<option value="${c.id}">${c.client_name}</option>`).join(''); if (qs('clientId') && list.some(c=>String(c.id)===qs('clientId'))) { customerSelect.value = qs('clientId'); fillCustomer(); } }
function filterCustomers(){ const k = customerSearch.value.trim().toLowerCase(); filteredClients = clients.filter(c => (c.client_name||'').toLowerCase().includes(k) || !k); renderCustomerSelect(filteredClients); }
function fillCustomer(){ const c = clients.find(x=>String(x.id)===String(customerSelect.value)); if(!c) return; customerTaxId.value = c.tax_id || ''; contactPerson.value = c.contact_person || ''; contactPhone.value = c.phone || ''; contactJobTitle.value = c.job_title || ''; customerAddress.value = c.address || ''; renderAcceptance(); }
function renderAcceptance(){ const option = customerSelect.options[customerSelect.selectedIndex]; const customerName = option && option.value ? option.text : '＿＿＿＿'; acceptancePreview.innerHTML = `<div class="doc-head"><div><h2>昱拓弱電有限公司</h2><div class="doc-sub">施工完成驗收單</div></div><div class="doc-sub" style="text-align:right;">客戶：${customerName}<br>客戶統編：${customerTaxId.value||'＿＿＿＿＿＿＿＿'}<br>聯絡人：${contactPerson.value||'＿＿＿＿'}<br>電話：${contactPhone.value||'＿＿＿＿'}</div></div><div class="block"><h3>通訊地址</h3><p>${nl2br(customerAddress.value||'＿＿＿＿＿＿＿＿＿＿')}</p></div><div class="block"><h3>驗收項目</h3><ol>${splitLines(acceptanceContent.value).map(x=>`<li>${x.replace(/^\d+\./,'').trim()}</li>`).join('')}</ol></div><div class="block"><h3>備註</h3><p>${nl2br(acceptanceNote.value)}</p></div><div class="block"><h3>驗收結論</h3><p>□ 驗收完成　　□ 待改善後複驗</p></div><div class="sign-grid"><div class="sign-box">客戶 / 管理單位簽章：<br><br>日期：＿＿＿＿年＿＿＿＿月＿＿＿＿日</div><div class="sign-box">昱拓弱電有限公司 現場人員：<br><br>日期：＿＿＿＿年＿＿＿＿月＿＿＿＿日</div></div>`; }
async function saveAcceptance(){ const payload = { client_id: customerSelect.value || null, contact_person: contactPerson.value || '', contact_phone: contactPhone.value || '', address: customerAddress.value || '', content: acceptanceContent.value || '', note: acceptanceNote.value || '' }; if (!payload.client_id){ alert('請先選擇客戶。'); return; } if (acceptanceId.value){ await API.updateAcceptance(acceptanceId.value, payload); alert('驗收單已更新。'); } else { await API.createAcceptance(payload); alert('驗收單已儲存。'); } }
async function loadEditIfNeeded(){ const id = qs('id'); if (!id) return; acceptanceMode.textContent = '修改'; acceptanceId.value = id; const d = await API.getAcceptance(id); customerSelect.value = d.client_id ? String(d.client_id) : ''; fillCustomer(); acceptanceContent.value = d.content || ''; acceptanceNote.value = d.note || ''; renderAcceptance(); }
async function init(){ clients = await API.getClients(); filteredClients = [...clients]; renderCustomerSelect(filteredClients); ['contactPerson','contactPhone','contactJobTitle','customerAddress','acceptanceContent','acceptanceNote'].forEach(id=>document.getElementById(id).addEventListener('input', renderAcceptance)); customerSearch.addEventListener('input', filterCustomers); customerSelect.addEventListener('change', fillCustomer); saveAcceptanceBtn.addEventListener('click', saveAcceptance); await loadEditIfNeeded(); renderAcceptance(); }
init().catch(err=>alert(err.message));
