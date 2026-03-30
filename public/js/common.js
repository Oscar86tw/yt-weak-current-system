
const COMPANY={name:'昱拓弱電有限公司',tag:'弱電系統維修｜監控｜門禁｜對講｜車道停管｜BA中央監控',phone:'0960-770-512',address:'桃園市中壢區榮安一街490號13樓'};
window.API={
 token(){return localStorage.getItem('yt_token')||'';},
 role(){return localStorage.getItem('yt_role')||'';},
 async request(url,options={}){options.headers={...(options.headers||{}),'Authorization':'Bearer '+this.token()};const r=await fetch(url,options);if(r.status===401){localStorage.clear();location.href='/login.html';throw new Error('登入已效');}if(r.status===403) throw new Error('你沒有此操作權限');return r;},
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
 async listPayables(){return (await this.request('/api/payables')).json();}
};
function money(v){return Number(v||0).toLocaleString('zh-TW',{maximumFractionDigits:0});}
function nl2br(s){return (s||'').replace(/\n/g,'<br>');}
function splitLines(s){return (s||'').split('\n').filter(Boolean);}
function qs(name){return new URL(location.href).searchParams.get(name)||'';}
function requireLogin(){if(!localStorage.getItem('yt_token')){location.href='/login.html';return false;}return true;}
function logout(){localStorage.clear();location.href='/login.html';}
function active(path){return location.pathname.endsWith(path);}
function toggleMenu(id){const el=document.getElementById(id);if(el)el.classList.toggle('hidden');}
function openMenusByPath(){
  const p=location.pathname;
  if(['suppliers.html','equipment.html','purchase.html','quote.html','contracts.html','acceptance.html'].some(x=>p.endsWith(x))){
    const el=document.getElementById('menu-create');if(el)el.classList.remove('hidden');
  }
  if(['quotes.html','contracts_history.html','acceptances_history.html','quote_tracking.html','purchases.html','payables.html'].some(x=>p.endsWith(x))){
    const el=document.getElementById('menu-query');if(el)el.classList.remove('hidden');
  }
  if(['users.html'].some(x=>p.endsWith(x))){
    const el=document.getElementById('menu-system');if(el)el.classList.remove('hidden');
  }
}
function shell(title,content){
  if(!requireLogin())return '';
  const user=localStorage.getItem('yt_user')||'';
  return `<div class="wrap"><div class="topbar"><div class="brand"><h1>${COMPANY.name}｜V3.2 最終優化版</h1><p>${title}</p></div><div class="actions"><span class="badge">${user}</span><span class="badge">${API.role()==='admin'?'管理者':'檢視者'}</span><button class="secondary" onclick="logout()">登出</button></div></div><div class="layout"><aside class="sidebar"><div class="nav-title">主功能</div><div class="menu"><a class="btn ${active('index.html')||location.pathname==='/'?'active':''}" href="/index.html">首頁</a><button class="btn parent" onclick="toggleMenu('menu-system')">系統設定</button><div id="menu-system" class="submenu hidden">${API.role()==='admin'?`<a class="btn ${active('users.html')?'active':''}" href="/users.html">帳戶管理</a>`:''}</div><a class="btn ${active('clients.html')?'active':''}" href="/clients.html">客戶資料</a><button class="btn parent" onclick="toggleMenu('menu-create')">新增</button><div id="menu-create" class="submenu hidden"><a class="btn ${active('suppliers.html')?'active':''}" href="/suppliers.html">供應商</a><a class="btn ${active('equipment.html')?'active':''}" href="/equipment.html">設備</a><a class="btn ${active('purchase.html')?'active':''}" href="/purchase.html">進貨單</a><a class="btn ${active('quote.html')?'active':''}" href="/quote.html">報價單</a><a class="btn ${active('contracts.html')?'active':''}" href="/contracts.html">維護合約單</a><a class="btn ${active('acceptance.html')?'active':''}" href="/acceptance.html">驗收單</a></div><button class="btn parent" onclick="toggleMenu('menu-query')">查詢</button><div id="menu-query" class="submenu hidden"><a class="btn ${active('quotes.html')?'active':''}" href="/quotes.html">報價單</a><a class="btn ${active('contracts_history.html')?'active':''}" href="/contracts_history.html">維護合約單</a><a class="btn ${active('acceptances_history.html')?'active':''}" href="/acceptances_history.html">驗收單</a><a class="btn ${active('quote_tracking.html')?'active':''}" href="/quote_tracking.html">報價追蹤</a><a class="btn ${active('purchases.html')?'active':''}" href="/purchases.html">進貨查詢</a><a class="btn ${active('payables.html')?'active':''}" href="/payables.html">應付帳款</a></div></div><div style="margin-top:16px" class="info-box">主功能已修正為：首頁、系統設定、客戶資料、新增、查詢。新增第二層：供應商、設備、進貨單、報價單、維護合約單、驗收單；系統設定第二層：帳戶管理。</div></aside><main class="main">${content}</main></div></div>`;
}
document.addEventListener('DOMContentLoaded',openMenusByPath);
