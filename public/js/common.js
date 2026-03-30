
const COMPANY={name:'昱拓弱電有限公司',tag:'弱電系統維修｜監控｜門禁｜對講｜車道停管｜BA中央監控',phone:'0960-770-512',address:'桃園市中壢區榮安一街490號13樓'};
window.API={
 token(){return localStorage.getItem('yt_token')||''},
 role(){return localStorage.getItem('yt_role')||''},
 async request(url,options={}){options.headers={...(options.headers||{}),'Authorization':'Bearer '+this.token()};const r=await fetch(url,options);if(r.status===401){localStorage.clear();location.href='/login.html';throw new Error('登入已失效')}if(r.status===403) throw new Error('你沒有此操作權限');return r},
 async login(username,password){const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});if(!r.ok) throw new Error('帳號或密碼錯誤');return r.json()},
 async getUsers(){const r=await this.request('/api/users');return r.json()},
 async createUser(p){const r=await this.request('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});return r.json()},
 async updateUser(id,p){const r=await this.request('/api/users/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});return r.json()},
 async getClients(){const r=await this.request('/api/clients');return r.json()},
 async createClient(p){const r=await this.request('/api/clients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});return r.json()},
 async updateClient(id,p){const r=await this.request('/api/clients/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});return r.json()},
 async deleteClient(id){const r=await this.request('/api/clients/'+id,{method:'DELETE'});return r.json()},
 async nextNo(type){const r=await this.request('/api/serials/next?type='+encodeURIComponent(type));return r.json()},
 async listQuotes(){const r=await this.request('/api/quotes');return r.json()},
 async getQuote(id){const r=await this.request('/api/quotes/'+id);return r.json()},
 async createQuote(p){const r=await this.request('/api/quotes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});return r.json()},
 async updateQuote(id,p){const r=await this.request('/api/quotes/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});return r.json()},
 async deleteQuote(id){const r=await this.request('/api/quotes/'+id,{method:'DELETE'});return r.json()},
 async listContracts(){const r=await this.request('/api/contracts');return r.json()},
 async getContract(id){const r=await this.request('/api/contracts/'+id);return r.json()},
 async createContract(p){const r=await this.request('/api/contracts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});return r.json()},
 async updateContract(id,p){const r=await this.request('/api/contracts/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});return r.json()},
 async deleteContract(id){const r=await this.request('/api/contracts/'+id,{method:'DELETE'});return r.json()},
 async listAcceptances(){const r=await this.request('/api/acceptances');return r.json()},
 async getAcceptance(id){const r=await this.request('/api/acceptances/'+id);return r.json()},
 async createAcceptance(p){const r=await this.request('/api/acceptances',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});return r.json()},
 async updateAcceptance(id,p){const r=await this.request('/api/acceptances/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});return r.json()},
 async deleteAcceptance(id){const r=await this.request('/api/acceptances/'+id,{method:'DELETE'});return r.json()},
 async listEquipment(){const r=await this.request('/api/equipment');return r.json()},
 async createEquipment(p){const r=await this.request('/api/equipment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});return r.json()},
 async updateEquipment(id,p){const r=await this.request('/api/equipment/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});return r.json()},
 async deleteEquipment(id){const r=await this.request('/api/equipment/'+id,{method:'DELETE'});return r.json()},
 async listQuoteTracking(){const r=await this.request('/api/quote-tracking');return r.json()},
 async updateQuoteTracking(id,p){const r=await this.request('/api/quote-tracking/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});return r.json()},
 async sendPdfMail(p){const r=await this.request('/api/send-pdf-mail',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});return r.json()}
};
function money(v){return Number(v||0).toLocaleString('zh-TW',{maximumFractionDigits:0})}
function nl2br(s){return (s||'').replace(/\n/g,'<br>')}
function splitLines(s){return (s||'').split('\n').filter(Boolean)}
function qs(name){return new URL(location.href).searchParams.get(name)||''}
function requireLogin(){if(!localStorage.getItem('yt_token')){location.href='/login.html';return false}return true}
function logout(){localStorage.clear();location.href='/login.html'}
function active(path){return location.pathname.endsWith(path)}
function toggleMenu(id){const el=document.getElementById(id);if(el) el.classList.toggle('hidden')}
function openMenusByPath(){const p=location.pathname;if(['quote.html','contracts.html','acceptance.html'].some(x=>p.endsWith(x))){const el=document.getElementById('menu-create');if(el) el.classList.remove('hidden')}if(['quotes.html','contracts_history.html','acceptances_history.html','equipment.html','quote_tracking.html'].some(x=>p.endsWith(x))){const el=document.getElementById('menu-query');if(el) el.classList.remove('hidden')}}
function shareToLine(text){window.open('https://line.me/R/msg/text/?'+encodeURIComponent(text),'_blank')}
function shareToMail(subject,body){window.location.href='mailto:?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body)}
function roleBadge(){return API.role()?`<span class="badge">${API.role()==='admin'?'管理者':'檢視者'}</span>`:''}
function shell(title,content){if(!requireLogin()) return '';const user=localStorage.getItem('yt_user')||'';return `<div class="wrap"><div class="topbar"><div class="brand"><h1>${COMPANY.name}｜公司文件系統 V6 完整版</h1><p>${title}</p></div><div class="actions"><span class="badge">${user}</span>${roleBadge()}<button class="secondary" onclick="logout()">登出</button></div></div><div class="layout"><aside class="sidebar"><div class="nav-title">主功能</div><div class="menu"><a class="btn ${active('index.html')||location.pathname==='/'?'active':''}" href="/index.html">首頁</a><a class="btn ${active('clients.html')?'active':''}" href="/clients.html">客戶資料</a>${API.role()==='admin'?`<a class="btn ${active('users.html')?'active':''}" href="/users.html">帳戶管理</a>`:''}<button class="btn parent" onclick="toggleMenu('menu-create')">新增</button><div id="menu-create" class="submenu hidden"><a class="btn ${active('quote.html')?'active':''}" href="/quote.html">報價單</a><a class="btn ${active('contracts.html')?'active':''}" href="/contracts.html">維護合約單</a><a class="btn ${active('acceptance.html')?'active':''}" href="/acceptance.html">驗收單</a></div><button class="btn parent" onclick="toggleMenu('menu-query')">查詢</button><div id="menu-query" class="submenu hidden"><a class="btn ${active('quotes.html')?'active':''}" href="/quotes.html">報價單</a><a class="btn ${active('contracts_history.html')?'active':''}" href="/contracts_history.html">維護合約單</a><a class="btn ${active('acceptances_history.html')?'active':''}" href="/acceptances_history.html">驗收單</a><a class="btn ${active('equipment.html')?'active':''}" href="/equipment.html">設備</a><a class="btn ${active('quote_tracking.html')?'active':''}" href="/quote_tracking.html">報價單追蹤</a></div></div><div style="margin-top:16px" class="info-box">第一層綠色，第二層橙色。查詢頁已加入刪除確認功能。</div></aside><main class="main">${content}</main></div></div>`}
document.addEventListener('DOMContentLoaded',openMenusByPath)
