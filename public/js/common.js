
const COMPANY={name:'昱拓弱電有限公司',tag:'弱電系統維修｜監控｜門禁｜對講｜車道停管｜BA中央監控',phone:'0960-770-512',address:'桃園市中壢區榮安一街490號13樓'};
window.API={
 token(){return localStorage.getItem('yt_token')||'';},
 role(){return localStorage.getItem('yt_role')||'';},
 async request(url,options={}){options.headers={...(options.headers||{}),'Authorization':'Bearer '+this.token()};const r=await fetch(url,options);if(r.status===401){localStorage.clear();location.href='/login.html';throw new Error('登入已失效');}if(r.status===403) throw new Error('你沒有此操作權限');return r;},
 async login(username,password){const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});if(!r.ok) throw new Error('帳號或密碼錯誤');return r.json();},
 async getUsers(){return (await this.request('/api/users')).json();},
 async createUser(p){return (await this.request('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async updateUser(id,p){return (await this.request('/api/users/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async getClients(){return (await this.request('/api/clients')).json();},
 async createClient(p){return (await this.request('/api/clients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async updateClient(id,p){return (await this.request('/api/clients/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async deleteClient(id){return (await this.request('/api/clients/'+id,{method:'DELETE'})).json();},
 async getSuppliers(){return (await this.request('/api/suppliers')).json();},
 async createSupplier(p){return (await this.request('/api/suppliers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async updateSupplier(id,p){return (await this.request('/api/suppliers/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async deleteSupplier(id){return (await this.request('/api/suppliers/'+id,{method:'DELETE'})).json();},
 async listEquipment(){return (await this.request('/api/equipment')).json();},
 async createEquipment(p){return (await this.request('/api/equipment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async updateEquipment(id,p){return (await this.request('/api/equipment/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async deleteEquipment(id){return (await this.request('/api/equipment/'+id,{method:'DELETE'})).json();},
 async getEquipmentCategories(){return (await this.request('/api/equipment-categories')).json();},
 async createEquipmentCategory(p){return (await this.request('/api/equipment-categories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async updateEquipmentCategory(id,p){return (await this.request('/api/equipment-categories/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async deleteEquipmentCategory(id){return (await this.request('/api/equipment-categories/'+id,{method:'DELETE'})).json();},
 async nextNo(type){return (await this.request('/api/serials/next?type='+encodeURIComponent(type))).json();},
 async listQuotes(){return (await this.request('/api/quotes')).json();},
 async getQuote(id){return (await this.request('/api/quotes/'+id)).json();},
 async createQuote(p){return (await this.request('/api/quotes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async updateQuote(id,p){return (await this.request('/api/quotes/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async deleteQuote(id){return (await this.request('/api/quotes/'+id,{method:'DELETE'})).json();},
 async listContracts(){return (await this.request('/api/contracts')).json();},
 async getContract(id){return (await this.request('/api/contracts/'+id)).json();},
 async createContract(p){return (await this.request('/api/contracts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async updateContract(id,p){return (await this.request('/api/contracts/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async deleteContract(id){return (await this.request('/api/contracts/'+id,{method:'DELETE'})).json();},
 async listAcceptances(){return (await this.request('/api/acceptances')).json();},
 async getAcceptance(id){return (await this.request('/api/acceptances/'+id)).json();},
 async createAcceptance(p){return (await this.request('/api/acceptances',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async updateAcceptance(id,p){return (await this.request('/api/acceptances/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async deleteAcceptance(id){return (await this.request('/api/acceptances/'+id,{method:'DELETE'})).json();},
 async listQuoteTracking(){return (await this.request('/api/quote-tracking')).json();},
 async updateQuoteTracking(id,p){return (await this.request('/api/quote-tracking/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async listPurchases(){return (await this.request('/api/purchases')).json();},
 async getPurchase(id){return (await this.request('/api/purchases/'+id)).json();},
 async createPurchase(p){return (await this.request('/api/purchases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async updatePurchase(id,p){return (await this.request('/api/purchases/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async deletePurchase(id){return (await this.request('/api/purchases/'+id,{method:'DELETE'})).json();},
 async listPayables(){return (await this.request('/api/payables')).json();},
 async getSettings(){return (await this.request('/api/system-settings')).json();},
 async saveSettings(p){return (await this.request('/api/system-settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async getAnalysis(type){return (await this.request('/api/analysis/'+encodeURIComponent(type))).json();}
};
function money(v){return Number(v||0).toLocaleString('zh-TW',{maximumFractionDigits:0});}
function nl2br(s){return (s||'').replace(/\n/g,'<br>');}
function splitLines(s){return (s||'').split('\n').filter(Boolean);}
function qs(name){return new URL(location.href).searchParams.get(name)||'';}
function requireLogin(){if(!localStorage.getItem('yt_token')){location.href='/login.html';return false;}return true;}
function logout(){localStorage.clear();location.href='/login.html';}
function active(path){return location.pathname.endsWith(path);}
function toggleMenu(id){const el=document.getElementById(id);if(el)el.classList.toggle('hidden');}
function autoOpenByPath(){
  const p=location.pathname;
  if(['settings.html','users.html','equipment_categories.html','data_io.html'].some(x=>p.endsWith(x))) document.getElementById('menu-system')?.classList.remove('hidden');
  if(['clients.html'].some(x=>p.endsWith(x))) document.getElementById('menu-client')?.classList.remove('hidden');
  if(['suppliers.html','equipment.html','purchase.html','quote.html','contracts.html','acceptance.html','supplier_analysis.html','equipment_analysis.html','purchase_analysis.html','quote_analysis.html','contract_analysis.html','acceptance_analysis.html','purchases.html','quotes.html','contracts_history.html','acceptances_history.html','quote_tracking.html','payables.html'].some(x=>p.endsWith(x))) document.getElementById('menu-build')?.classList.remove('hidden');
  const groups=[
    [['suppliers.html','supplier_analysis.html'],'menu-supplier-3'],
    [['equipment.html','equipment_analysis.html'],'menu-equipment-3'],
    [['purchase.html','purchases.html','purchase_analysis.html','payables.html'],'menu-purchase-3'],
    [['quote.html','quotes.html','quote_analysis.html','quote_tracking.html'],'menu-quote-3'],
    [['contracts.html','contracts_history.html','contract_analysis.html'],'menu-contract-3'],
    [['acceptance.html','acceptances_history.html','acceptance_analysis.html'],'menu-accept-3'],
  ];
  groups.forEach(([pages,id])=>{if(pages.some(x=>p.endsWith(x))) document.getElementById(id)?.classList.remove('hidden');});
}
function shell(title,content){
  if(!requireLogin())return '';
  const user=localStorage.getItem('yt_user')||'';
  return `<div class="wrap"><div class="topbar"><div class="brand"><h1>${COMPANY.name}｜V3.5.1 修正版</h1><p>${title}</p></div><div class="actions"><span class="badge">${user}</span><span class="badge">${API.role()==='admin'?'管理者':'檢視者'}</span><button class="secondary" onclick="logout()">登出</button></div></div><div class="layout"><aside class="sidebar"><div class="nav-title">主功能</div><div class="menu">
  <a class="btn ${active('index.html')||location.pathname==='/'?'active':''}" href="/index.html">首頁</a>
  <button class="btn parent" onclick="toggleMenu('menu-system')">系統設定</button>
  <div id="menu-system" class="submenu hidden">
    <a class="btn ${active('settings.html')?'active':''}" href="/settings.html">公司基本設定</a>
    ${API.role()==='admin'?`<a class="btn ${active('users.html')?'active':''}" href="/users.html">帳戶管理</a>`:''}
    <a class="btn ${active('equipment_categories.html')?'active':''}" href="/equipment_categories.html">設備類別</a><a class="btn ${active('data_io.html')?'active':''}" href="/data_io.html">資料匯入匯出</a>
  </div>
  <button class="btn parent" onclick="toggleMenu('menu-client')">客戶資料</button>
  <div id="menu-client" class="submenu hidden">
    <a class="btn ${active('clients.html')?'active':''}" href="/clients.html">客戶資料管理</a>
  </div>
  <button class="btn parent" onclick="toggleMenu('menu-build')">資料建立</button>
  <div id="menu-build" class="submenu hidden">
    <button class="btn parent" onclick="toggleMenu('menu-supplier-3')">供應商</button>
    <div id="menu-supplier-3" class="submenu3 hidden">
      <a class="btn ${active('suppliers.html')?'active':''}" href="/suppliers.html">新增</a>
      <a class="btn ${active('suppliers.html')?'active':''}" href="/suppliers.html">查詢</a>
      <a class="btn ${active('suppliers.html')?'active':''}" href="/suppliers.html">清單列表</a>
      <a class="btn ${active('supplier_analysis.html')?'active':''}" href="/supplier_analysis.html">分析</a>
    </div>
    <button class="btn parent" onclick="toggleMenu('menu-equipment-3')">設備</button>
    <div id="menu-equipment-3" class="submenu3 hidden">
      <a class="btn ${active('equipment.html')?'active':''}" href="/equipment.html">新增</a>
      <a class="btn ${active('equipment.html')?'active':''}" href="/equipment.html">查詢</a>
      <a class="btn ${active('equipment.html')?'active':''}" href="/equipment.html">清單列表</a>
      <a class="btn ${active('equipment_analysis.html')?'active':''}" href="/equipment_analysis.html">分析</a>
    </div>
    <button class="btn parent" onclick="toggleMenu('menu-purchase-3')">進貨單</button>
    <div id="menu-purchase-3" class="submenu3 hidden">
      <a class="btn ${active('purchase.html')?'active':''}" href="/purchase.html">新增</a>
      <a class="btn ${active('purchases.html')?'active':''}" href="/purchases.html">查詢</a>
      <a class="btn ${active('purchases.html')?'active':''}" href="/purchases.html">清單列表</a>
      <a class="btn ${active('purchase_analysis.html')?'active':''}" href="/purchase_analysis.html">分析</a>
    </div>
    <button class="btn parent" onclick="toggleMenu('menu-quote-3')">報價單</button>
    <div id="menu-quote-3" class="submenu3 hidden">
      <a class="btn ${active('quote.html')?'active':''}" href="/quote.html">新增</a>
      <a class="btn ${active('quotes.html')?'active':''}" href="/quotes.html">查詢</a>
      <a class="btn ${active('quotes.html')?'active':''}" href="/quotes.html">清單列表</a>
      <a class="btn ${active('quote_analysis.html')?'active':''}" href="/quote_analysis.html">分析</a>
    </div>
    <button class="btn parent" onclick="toggleMenu('menu-contract-3')">維護合約單</button>
    <div id="menu-contract-3" class="submenu3 hidden">
      <a class="btn ${active('contracts.html')?'active':''}" href="/contracts.html">新增</a>
      <a class="btn ${active('contracts_history.html')?'active':''}" href="/contracts_history.html">查詢</a>
      <a class="btn ${active('contracts_history.html')?'active':''}" href="/contracts_history.html">清單列表</a>
      <a class="btn ${active('contract_analysis.html')?'active':''}" href="/contract_analysis.html">分析</a>
    </div>
    <button class="btn parent" onclick="toggleMenu('menu-accept-3')">驗收單</button>
    <div id="menu-accept-3" class="submenu3 hidden">
      <a class="btn ${active('acceptance.html')?'active':''}" href="/acceptance.html">新增</a>
      <a class="btn ${active('acceptances_history.html')?'active':''}" href="/acceptances_history.html">查詢</a>
      <a class="btn ${active('acceptances_history.html')?'active':''}" href="/acceptances_history.html">清單列表</a>
      <a class="btn ${active('acceptance_analysis.html')?'active':''}" href="/acceptance_analysis.html">分析</a>
    </div>
  </div>
  </div><div style="margin-top:16px" class="info-box">已修正選單層級與顯示：第一層不再保留獨立查詢，第三層各模組均可展開並連到新增、查詢、清單列表、分析。</div></aside><main class="main">${content}</main></div></div>`;
}
document.addEventListener('DOMContentLoaded',autoOpenByPath);

function downloadFile(url){ window.open(url, '_blank'); }
async function uploadExcel(endpoint, inputEl){
  if(!inputEl.files||!inputEl.files[0]){ alert('請先選擇 Excel 檔'); return; }
  const fd=new FormData();
  fd.append('file', inputEl.files[0]);
  const r=await API.request(endpoint,{method:'POST', body:fd});
  const data=await r.json();
  alert(`匯入完成：${data.imported||0} 筆`);
}
function lineSharePdf(type,id){
  if(!id){ alert('請先存檔後再分享 LINE'); return; }
  const pdfUrl = location.origin + `/api/${type}/${id}/pdf`;
  const shareUrl = 'https://line.me/R/share?text=' + encodeURIComponent(pdfUrl);
  window.open(shareUrl,'_blank');
}

window.API.searchQuotes = async (params)=> (await API.request('/api/quotes/search?'+new URLSearchParams(params))).json();
window.API.quoteSummary = async ()=> (await API.request('/api/quotes/summary')).json();
window.API.searchPurchases = async (params)=> (await API.request('/api/purchases/search?'+new URLSearchParams(params))).json();
window.API.purchaseSummary = async ()=> (await API.request('/api/purchases/summary')).json();
window.API.purchaseOverdue = async ()=> (await API.request('/api/purchases/overdue')).json();
window.API.searchEquipment = async (params)=> (await API.request('/api/equipment/search?'+new URLSearchParams(params))).json();
window.API.equipmentSummary = async ()=> (await API.request('/api/equipment/summary')).json();

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
let idleTimer = null;
function resetIdleTimer(){
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    alert('已超過 15 分鐘未操作，系統將自動登出。');
    logout();
  }, IDLE_TIMEOUT_MS);
}
['click','keydown','mousemove','scroll','touchstart'].forEach(evt=>{
  document.addEventListener(evt, ()=>{ if(localStorage.getItem('yt_token')) resetIdleTimer(); }, {passive:true});
});
document.addEventListener('DOMContentLoaded', ()=>{ if(localStorage.getItem('yt_token')) resetIdleTimer(); });
