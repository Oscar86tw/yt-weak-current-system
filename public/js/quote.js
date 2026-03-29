
document.getElementById('app').innerHTML = layout('新增報價單', `
<div class="split">
  <div class="form-panel">
    <h2 style="margin-top:0;">報價單表單 <span class="badge" id="quoteMode">新增</span></h2>
    <input type="hidden" id="quoteId">
    <div class="section-title">公司資訊</div>
    <div class="info-box">${COMPANY.name}<br>${COMPANY.tag}<br>電話：${COMPANY.phone}<br>地址：${COMPANY.address}</div>

    <div class="section-title">文件資訊</div>
    <div class="row">
      <div><label>文件編號</label><input id="docNo" value="" readonly></div>
      <div><label>日期</label><input id="docDate" placeholder="例如：115.03.29"></div>
    </div>

    <label>客戶搜尋</label><input id="customerSearch" placeholder="輸入客戶名稱關鍵字快速篩選">
    <label>客戶名稱（下拉選單）</label><select id="customerSelect"></select>
    <div class="row"><div><label>客戶統編</label><input id="customerTaxId" readonly></div><div><label>聯絡人</label><input id="contactPerson"></div></div>
    <div class="row"><div><label>聯絡電話</label><input id="contactPhone"></div><div><label>職位</label><input id="contactJobTitle"></div></div>
    <label>通訊地址</label><textarea id="customerAddress"></textarea>
    <label>工程名稱</label><input id="projectName">

    <div class="section-title">工程內容與費用</div>
    <div class="toolbar"><button id="addItemBtn">＋新增項目</button><button class="secondary" onclick="window.print()">一鍵匯出 PDF</button><button class="light" id="lineBtn">傳送到 LINE</button><button class="light" id="mailBtn">傳送到 MAIL</button></div>
    <div id="quoteItems"></div>

    <label>施工 / 查修說明</label><textarea id="quoteDesc"></textarea>
    <label>報價條款</label><textarea id="quoteTerms">1. 本報價單有效期限為15日。
2. 本公司依稅法規定，將全額開立統一發票。
3. 本工程完工後，客戶應於一個月內完成驗收；逾期未提出異議者，視同驗收完成。
4. 付款方式：本案於完工驗收後，請客戶於次月5日前完成撥款。
5. 本估價內容以現場現況施工為準，如有新增或變更項目，費用另行報價。</textarea>
    <div class="toolbar"><button id="saveQuoteBtn">存檔</button></div>
  </div>
  <div class="preview-panel" id="quotePreview"></div>
</div>`);
let clients=[], filteredClients=[], items=[];
function gv(id){ return document.getElementById(id).value || ''; }
function addItem(){ items.push({desc:'',qty:'',price:''}); renderItems(); renderDoc(); }
function removeItem(i){ items.splice(i,1); renderItems(); renderDoc(); }
function updateItem(i,k,v){ items[i][k]=v; renderDoc(); }
function renderItems(){ if(!items.length){ quoteItems.innerHTML='<div class="muted">尚未新增項目，請按「＋新增項目」。</div>'; return; } quoteItems.innerHTML=items.map((item,i)=>`<div class="quote-item-card"><div class="toolbar" style="justify-content:space-between;align-items:center;"><strong>項目 ${i+1}</strong><button class="danger" onclick="removeItem(${i})">刪除</button></div><label>估價事項</label><textarea oninput="updateItem(${i},'desc',this.value)">${item.desc||''}</textarea><div class="row"><div><label>數量</label><input value="${item.qty||''}" oninput="updateItem(${i},'qty',this.value)"></div><div><label>單價</label><input value="${item.price||''}" oninput="updateItem(${i},'price',this.value)"></div></div></div>`).join(''); }
function renderCustomerSelect(list){ customerSelect.innerHTML='<option value="">請選擇客戶</option>'+list.map(c=>`<option value="${c.id}">${c.client_name}</option>`).join(''); if(qs('clientId') && list.some(c=>String(c.id)===qs('clientId'))){ customerSelect.value=qs('clientId'); fillCustomer(); } }
function filterCustomers(){ const k=customerSearch.value.trim().toLowerCase(); filteredClients=clients.filter(c=>(c.client_name||'').toLowerCase().includes(k)||!k); renderCustomerSelect(filteredClients); }
function fillCustomer(){ const c=clients.find(x=>String(x.id)===String(customerSelect.value)); if(!c) return; customerTaxId.value=c.tax_id||''; contactPerson.value=c.contact_person||''; contactPhone.value=c.phone||''; contactJobTitle.value=c.job_title||''; customerAddress.value=c.address||''; renderDoc(); }
function header(title){ const option=customerSelect.options[customerSelect.selectedIndex]; const customerText=option&&option.value?option.text:'＿＿＿＿'; return `<div class="doc-head"><div><h2>${COMPANY.name}</h2><div class="doc-sub">${COMPANY.tag}<br>電話：${COMPANY.phone}<br>地址：${COMPANY.address}</div></div><div class="doc-sub" style="text-align:right;min-width:240px;"><strong style="font-size:20px;color:#111827;">${title}</strong><br><br>文件編號：${gv('docNo')||'＿＿＿＿'}<br>日期：${gv('docDate')||'＿＿＿＿'}<br>客戶：${customerText}<br>客戶統編：${gv('customerTaxId')||'＿＿＿＿＿＿＿＿'}<br>聯絡人：${gv('contactPerson')||'＿＿＿＿'}<br>電話：${gv('contactPhone')||'＿＿＿＿'}</div></div>`; }
function docSummary(){ const option=customerSelect.options[customerSelect.selectedIndex]; const customerText=option&&option.value?option.text:'未選擇客戶'; let subtotal=0; items.forEach(x=>subtotal += (parseFloat(x.qty)||0)*(parseFloat(x.price)||0)); const tax=Math.round(subtotal*.05), total=subtotal+tax; return `【${COMPANY.name} 工程報價單】\n單號：${gv('docNo')||''}\n日期：${gv('docDate')||''}\n客戶：${customerText}\n工程：${gv('projectName')||''}\n合計：NT$ ${money(total)}`; }
function renderDoc(){ let subtotal=0; const rows=items.map((item,i)=>{ const qty=parseFloat(item.qty)||0; const price=parseFloat(item.price)||0; const itemTotal=qty*price; subtotal+=itemTotal; return `<tr><td>${i+1}</td><td class="col-desc">${nl2br(item.desc)}</td><td class="col-qty">${qty||''}</td><td class="col-price">${price?'NT$ '+money(price):''}</td><td class="col-total">${itemTotal?'NT$ '+money(itemTotal):''}</td></tr>`; }).join(''); const tax=Math.round(subtotal*.05), total=subtotal+tax; quotePreview.innerHTML=`${header('工程報價單')}<div class="block"><h3>工程名稱</h3><p>${gv('projectName')||'＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿'}</p></div><div class="block"><h3>客戶資訊</h3><p>通訊地址：${nl2br(gv('customerAddress')||'＿＿＿＿＿＿＿＿＿＿＿＿')}<br>職位：${gv('contactJobTitle')||'＿＿＿＿'}</p></div><div class="block"><h3>工程內容與費用</h3><table class="table"><thead><tr><th style="width:60px;">項次</th><th class="col-desc">估價事項</th><th class="col-qty">數量</th><th class="col-price">單價</th><th class="col-total">小計</th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="muted">尚未新增報價項目</td></tr>'}</tbody></table><p style="text-align:right;margin-top:12px;line-height:1.9;">小計：NT$ ${money(subtotal)}<br>營業稅（5%）：NT$ ${money(tax)}<br><strong style="font-size:18px;">合計：NT$ ${money(total)}</strong></p></div><div class="block"><h3>施工 / 查修說明</h3><p>${nl2br(gv('quoteDesc'))||'&nbsp;'}</p></div><div class="block"><h3>報價條款與備註</h3><ol>${splitLines(gv('quoteTerms')).map(x=>`<li>${x.replace(/^\\d+\\./,'').trim()}</li>`).join('')}</ol></div><div class="sign-grid"><div class="sign-box">客戶簽章：<br><br>日期：＿＿＿＿年＿＿＿＿月＿＿＿＿日</div><div class="sign-box">${COMPANY.name}<br>公司印鑑：</div></div>`; }
async function saveDoc(){ const payload={ quote_no:gv('docNo'), client_id:customerSelect.value||null, quote_date:gv('docDate'), project_name:gv('projectName'), quote_desc:gv('quoteDesc'), quote_terms:gv('quoteTerms'), items:items.map((x,i)=>({item_order:i+1,item_desc:x.desc,qty:Number(x.qty||0),unit_price:Number(x.price||0)})) }; if(!payload.client_id){ alert('請先選擇客戶。'); return; } if(!payload.project_name){ alert('請先輸入工程名稱。'); return; } if(quoteId.value){ await API.updateQuote(quoteId.value,payload); alert('報價已更新。'); } else { await API.createQuote(payload); alert('報價已儲存。'); const next=await API.nextQuoteNo(); docNo.value=next.quote_no; } }
async function loadEdit(){ const id=qs('id'); if(!id) return; quoteMode.textContent='修改'; quoteId.value=id; const d=await API.getQuote(id); docNo.value=d.quote_no||''; docDate.value=d.quote_date||''; projectName.value=d.project_name||''; quoteDesc.value=d.quote_desc||''; quoteTerms.value=d.quote_terms||''; customerSelect.value=d.client_id?String(d.client_id):''; fillCustomer(); items=(d.items||[]).map(x=>({desc:x.item_desc||'',qty:x.qty||'',price:x.unit_price||''})); renderItems(); renderDoc(); }
async function init(){ clients=await API.getClients(); filteredClients=[...clients]; renderCustomerSelect(filteredClients); const next=await API.nextQuoteNo(); docNo.value=next.quote_no; if(!items.length) addItem(); ['docNo','docDate','customerTaxId','contactPerson','contactPhone','contactJobTitle','customerAddress','projectName','quoteDesc','quoteTerms'].forEach(id=>document.getElementById(id).addEventListener('input',renderDoc)); customerSearch.addEventListener('input',filterCustomers); customerSelect.addEventListener('change',fillCustomer); addItemBtn.addEventListener('click',addItem); saveQuoteBtn.addEventListener('click',saveDoc); lineBtn.addEventListener('click',()=>shareToLine(docSummary())); mailBtn.addEventListener('click',()=>shareToMail('工程報價單 '+gv('docNo'), docSummary())); await loadEdit(); renderDoc(); }
init().catch(err=>alert(err.message));
