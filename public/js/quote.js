
document.getElementById('app').innerHTML = layout('新增報價單', `
<div class="split">
  <div class="form-panel">
    <h2 style="margin-top:0;">報價單表單 <span class="badge" id="quoteMode">新增</span></h2>
    <input type="hidden" id="quoteId">
    <div class="section-title">公司基本資料</div>
    <label>公司名稱</label><input id="companyName" value="昱拓弱電有限公司">
    <label>服務標語</label><input id="companyTag" value="弱電系統維修｜監控｜門禁｜對講｜車道停管｜BA中央監控">
    <label>聯絡電話</label><input id="companyPhone" value="0960-770-512">
    <label>公司地址</label><input id="companyAddress" value="桃園市中壢區榮安一街490號13樓">
    <label>公司統編</label><input id="companyTaxId" placeholder="請輸入統編">

    <div class="section-title">文件資訊</div>
    <div class="row">
      <div><label>文件編號</label><input id="docNo" value="" readonly></div>
      <div><label>日期</label><input id="docDate" placeholder="例如：115.03.29"></div>
    </div>

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
    <label>工程名稱</label><input id="projectName">

    <div class="section-title">工程內容與費用</div>
    <div class="toolbar">
      <button id="addItemBtn">＋新增項目</button>
      <button class="secondary" onclick="window.print()">一鍵匯出 PDF</button>
    </div>
    <div id="quoteItems"></div>

    <label>施工 / 查修說明</label><textarea id="quoteDesc">1. 本案包含對講主機拆卸後送原廠進行檢測與維修作業，實際維修內容依原廠檢測結果為準。
2. 設備拆卸送修期間，原大門門禁系統將暫時無法進行管制，建議管理單位於維修期間加強巡視。
3. 設備返廠維修期間之工期，依原廠作業時間為準。
4. 設備維修完成並返場安裝後，將恢復原有門禁控制功能並進行基本測試。
5. 維修期間因門禁暫時解除管制所產生之安全風險，建議由管理單位自行加強巡視與管理。</textarea>

    <label>報價條款</label><textarea id="quoteTerms">1. 本報價單有效期限為15日。
2. 本公司依稅法規定，將全額開立統一發票。
3. 本工程完工後，客戶應於一個月內完成驗收；逾期未提出異議者，視同驗收完成。
4. 付款方式：本案於完工驗收後，請客戶於次月5日前完成撥款。
5. 本估價內容以現場現況施工為準，如有新增或變更項目，費用另行報價。</textarea>

    <div class="toolbar"><button id="saveQuoteBtn">存檔</button></div>
  </div>
  <div class="preview-panel" id="quotePreview"></div>
</div>`);
let clients = [], filteredClients = [], quoteItems = [];
function gv(id){ return document.getElementById(id).value || ''; }
function addQuoteItem(){ quoteItems.push({desc:'',qty:'',price:''}); renderQuoteItems(); renderQuote(); }
function removeQuoteItem(i){ quoteItems.splice(i,1); renderQuoteItems(); renderQuote(); }
function updateQuoteItem(i,k,v){ quoteItems[i][k]=v; renderQuote(); }
function renderQuoteItems(){
  const box = document.getElementById('quoteItems');
  if (!quoteItems.length){ box.innerHTML = '<div class="muted">尚未新增項目，請按「＋新增項目」。</div>'; return; }
  box.innerHTML = quoteItems.map((item,i)=>`<div class="quote-item-card"><div class="toolbar" style="justify-content:space-between;align-items:center;"><strong>項目 ${i+1}</strong><button class="danger" onclick="removeQuoteItem(${i})">刪除</button></div><label>估價事項</label><textarea oninput="updateQuoteItem(${i},'desc',this.value)">${item.desc||''}</textarea><div class="row"><div><label>數量</label><input value="${item.qty||''}" oninput="updateQuoteItem(${i},'qty',this.value)"></div><div><label>單價</label><input value="${item.price||''}" oninput="updateQuoteItem(${i},'price',this.value)"></div></div></div>`).join('');
}
function renderCustomerSelect(list){
  customerSelect.innerHTML = '<option value="">請選擇客戶</option>' + list.map(c=>`<option value="${c.id}">${c.client_name}</option>`).join('');
  const p = qs('clientId');
  if (p && list.some(c => String(c.id) === String(p))) { customerSelect.value = p; fillCustomer(); }
}
function filterCustomers(){
  const k = customerSearch.value.trim().toLowerCase();
  filteredClients = clients.filter(c => (c.client_name || '').toLowerCase().includes(k) || !k);
  renderCustomerSelect(filteredClients);
}
function fillCustomer(){
  const c = clients.find(x => String(x.id) === String(customerSelect.value));
  if (!c) return;
  customerTaxId.value = c.tax_id || '';
  contactPerson.value = c.contact_person || '';
  contactPhone.value = c.phone || '';
  contactJobTitle.value = c.job_title || '';
  customerAddress.value = c.address || '';
  renderQuote();
}
function header(title){
  const option = customerSelect.options[customerSelect.selectedIndex];
  const customerText = option && option.value ? option.text : '＿＿＿＿';
  return `<div class="doc-head"><div><h2>${gv('companyName')}</h2><div class="doc-sub">${gv('companyTag')}<br>電話：${gv('companyPhone')}<br>地址：${gv('companyAddress')}<br>統一編號：${gv('companyTaxId')||'＿＿＿＿＿＿＿＿'}</div></div><div class="doc-sub" style="text-align:right;min-width:240px;"><strong style="font-size:20px;color:#111827;">${title}</strong><br><br>文件編號：${gv('docNo')||'＿＿＿＿'}<br>日期：${gv('docDate')||'＿＿＿＿'}<br>客戶：${customerText}<br>客戶統編：${gv('customerTaxId')||'＿＿＿＿＿＿＿＿'}<br>聯絡人：${gv('contactPerson')||'＿＿＿＿'}<br>電話：${gv('contactPhone')||'＿＿＿＿'}</div></div>`;
}
function renderQuote(){
  let subtotal = 0;
  const rows = quoteItems.map((item,i)=>{ const qty = parseFloat(item.qty)||0; const price = parseFloat(item.price)||0; const itemTotal = qty*price; subtotal += itemTotal; return `<tr><td>${i+1}</td><td class="col-desc">${nl2br(item.desc)}</td><td class="col-qty">${qty||''}</td><td class="col-price">${price?'NT$ '+money(price):''}</td><td class="col-total">${itemTotal?'NT$ '+money(itemTotal):''}</td></tr>`; }).join('');
  const tax = Math.round(subtotal * 0.05), total = subtotal + tax;
  quotePreview.innerHTML = `${header('工程報價單')}<div class="block"><h3>工程名稱</h3><p>${gv('projectName')||'＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿'}</p></div><div class="block"><h3>客戶資訊</h3><p>通訊地址：${nl2br(gv('customerAddress')||'＿＿＿＿＿＿＿＿＿＿＿＿')}<br>職位：${gv('contactJobTitle')||'＿＿＿＿'}</p></div><div class="block"><h3>工程內容與費用</h3><table class="table"><thead><tr><th style="width:60px;">項次</th><th class="col-desc">估價事項</th><th class="col-qty">數量</th><th class="col-price">單價</th><th class="col-total">小計</th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="muted">尚未新增報價項目</td></tr>'}</tbody></table><p style="text-align:right;margin-top:12px;line-height:1.9;">小計：NT$ ${money(subtotal)}<br>營業稅（5%）：NT$ ${money(tax)}<br><strong style="font-size:18px;">合計：NT$ ${money(total)}</strong></p></div><div class="block"><h3>施工 / 查修說明</h3><ol>${splitLines(gv('quoteDesc')).map(x=>`<li>${x.replace(/^\d+\./,'').trim()}</li>`).join('')}</ol></div><div class="block"><h3>報價條款與備註</h3><ol>${splitLines(gv('quoteTerms')).map(x=>`<li>${x.replace(/^\d+\./,'').trim()}</li>`).join('')}</ol></div><div class="sign-grid"><div class="sign-box">客戶簽章：<br><br>日期：＿＿＿＿年＿＿＿＿月＿＿＿＿日</div><div class="sign-box">${gv('companyName')}<br>公司印鑑：<br><br>統一編號：${gv('companyTaxId')||'＿＿＿＿＿＿＿＿'}</div></div>`;
}
async function saveQuote(){
  const payload = { quote_no: gv('docNo'), client_id: customerSelect.value || null, quote_date: gv('docDate'), project_name: gv('projectName'), quote_desc: gv('quoteDesc'), quote_terms: gv('quoteTerms'), items: quoteItems.map((x,i)=>({item_order:i+1,item_desc:x.desc,qty:Number(x.qty||0),unit_price:Number(x.price||0)})) };
  if (!payload.client_id){ alert('請先選擇客戶。'); return; }
  if (!payload.project_name){ alert('請先輸入工程名稱。'); return; }
  if (quoteId.value){ await API.updateQuote(quoteId.value, payload); alert('報價已更新。'); }
  else { await API.createQuote(payload); alert('報價已儲存。'); const next = await API.nextQuoteNo(); docNo.value = next.quote_no; }
}
async function loadEditIfNeeded(){
  const id = qs('id');
  if (!id) return;
  quoteMode.textContent = '修改';
  quoteId.value = id;
  const data = await API.getQuote(id);
  docNo.value = data.quote_no || '';
  docDate.value = data.quote_date || '';
  projectName.value = data.project_name || '';
  quoteDesc.value = data.quote_desc || '';
  quoteTerms.value = data.quote_terms || '';
  customerSelect.value = data.client_id ? String(data.client_id) : '';
  fillCustomer();
  quoteItems = (data.items || []).map(x => ({ desc: x.item_desc || '', qty: x.qty || '', price: x.unit_price || '' }));
  renderQuoteItems(); renderQuote();
}
async function init(){
  clients = await API.getClients(); filteredClients = [...clients]; renderCustomerSelect(filteredClients);
  const next = await API.nextQuoteNo(); docNo.value = next.quote_no;
  if (!quoteItems.length) addQuoteItem();
  ['companyName','companyTag','companyPhone','companyAddress','companyTaxId','docNo','docDate','customerTaxId','contactPerson','contactPhone','contactJobTitle','customerAddress','projectName','quoteDesc','quoteTerms'].forEach(id=>document.getElementById(id).addEventListener('input', renderQuote));
  customerSearch.addEventListener('input', filterCustomers);
  customerSelect.addEventListener('change', fillCustomer);
  addItemBtn.addEventListener('click', addQuoteItem);
  saveQuoteBtn.addEventListener('click', saveQuote);
  await loadEditIfNeeded();
  renderQuote();
}
init().catch(err=>alert(err.message));
