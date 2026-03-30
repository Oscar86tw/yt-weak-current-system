
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
 async nextNo(type){return (await this.request('/api/serials/next?type='+encodeURIComponent(type))).json();},
 async getSuppliers(){return (await this.request('/api/suppliers')).json();},
 async createSupplier(p){return (await this.request('/api/suppliers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async updateSupplier(id,p){return (await this.request('/api/suppliers/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async deleteSupplier(id){return (await this.request('/api/suppliers/'+id,{method:'DELETE'})).json();},
 async listEquipment(){return (await this.request('/api/equipment')).json();},
 async createEquipment(p){return (await this.request('/api/equipment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async updateEquipment(id,p){return (await this.request('/api/equipment/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async deleteEquipment(id){return (await this.request('/api/equipment/'+id,{method:'DELETE'})).json();},
 async listQuotes(){return (await this.request('/api/quotes')).json();},
 async listPurchases(){return (await this.request('/api/purchases')).json();},
 async getPurchase(id){return (await this.request('/api/purchases/'+id)).json();},
 async createPurchase(p){return (await this.request('/api/purchases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async updatePurchase(id,p){return (await this.request('/api/purchases/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})).json();},
 async deletePurchase(id){return (await this.request('/api/purchases/'+id,{method:'DELETE'})).json();},
 async listPayables(){return (await this.request('/api/payables')).json();}
};
function money(v){return Number(v||0).toLocaleString('zh-TW',{maximumFractionDigits:0});}
function qs(name){return new URL(location.href).searchParams.get(name)||'';}
function requireLogin(){if(!localStorage.getItem('yt_token')){location.href='/login.html';return false;}return true;}
function logout(){localStorage.clear();location.href='/login.html';}
function active(path){return location.pathname.endsWith(path);}
function toggleMenu(id){const el=document.getElementById(id);if(el)el.classList.toggle('hidden');}
function openMenusByPath(){const p=location.pathname;if(['purchase.html'].some(x=>p.endsWith(x))){const el=document.getElementById('menu-create');if(el)el.classList.remove('hidden');}if(['suppliers.html','purchases.html','payables.html','equipment.html','clients.html','users.html'].some(x=>p.endsWith(x))){const el=document.getElementById('menu-query');if(el)el.classList.remove('hidden');}}
function shell(title,content){if(!requireLogin())return '';const user=localStorage.getItem('yt_user')||'';return `<div class="wrap"><div class="topbar"><div class="brand"><h1>${COMPANY.name}｜V3 進貨管帳整合版</h1><p>${title}</p></div><div class="actions"><span class="badge">${user}</span><span class="badge">${API.role()==='admin'?'管理者':'檢視者'}</span><button class="secondary" onclick="logout()">登出</button></div></div><div class="layout"><aside class="sidebar"><div class="nav-title">主功能</div><div class="menu"><a class="btn ${active('index.html')||location.pathname==='/'?'active':''}" href="/index.html">首頁</a><a class="btn ${active('clients.html')?'active':''}" href="/clients.html">客戶資料</a><a class="btn ${active('equipment.html')?'active':''}" href="/equipment.html">設備</a><button class="btn parent" onclick="toggleMenu('menu-create')">新增</button><div id="menu-create" class="submenu hidden"><a class="btn ${active('purchase.html')?'active':''}" href="/purchase.html">進貨單</a></div><button class="btn parent" onclick="toggleMenu('menu-query')">查詢</button><div id="menu-query" class="submenu hidden"><a class="btn ${active('suppliers.html')?'active':''}" href="/suppliers.html">供應商</a><a class="btn ${active('purchases.html')?'active':''}" href="/purchases.html">進貨查詢</a><a class="btn ${active('payables.html')?'active':''}" href="/payables.html">應付帳款</a>${API.role()==='admin'?`<a class="btn ${active('users.html')?'active':''}" href="/users.html">帳戶管理</a>`:''}</div></div><div style="margin-top:16px" class="info-box">進貨模式採直接對案場進貨，並含刪除確認機制。</div></aside><main class="main">${content}</main></div></div>`;}
document.addEventListener('DOMContentLoaded',openMenusByPath);
