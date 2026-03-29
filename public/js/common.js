
window.API = {
  token(){ return localStorage.getItem('yt_token') || ''; },
  async request(url, options={}){
    options.headers = {...(options.headers||{}), 'Authorization':'Bearer ' + this.token()};
    const r = await fetch(url, options);
    if (r.status === 401) {
      localStorage.removeItem('yt_token');
      localStorage.removeItem('yt_user');
      location.href = '/login.html';
      throw new Error('登入已失效');
    }
    return r;
  },
  async login(username, password){
    const r = await fetch('/api/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username,password})});
    if(!r.ok) throw new Error('帳號或密碼錯誤');
    return r.json();
  },
  async getClients(){ const r = await this.request('/api/clients'); if(!r.ok) throw new Error('載入客戶失敗'); return r.json(); },
  async getClient(id){ const r = await this.request('/api/clients/' + id); if(!r.ok) throw new Error('載入客戶失敗'); return r.json(); },
  async createClient(payload){ const r = await this.request('/api/clients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); if(!r.ok) throw new Error('建立客戶失敗'); return r.json(); },
  async updateClient(id,payload){ const r = await this.request('/api/clients/' + id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); if(!r.ok) throw new Error('更新客戶失敗'); return r.json(); },
  async deleteClient(id){ const r = await this.request('/api/clients/'+id,{method:'DELETE'}); if(!r.ok) throw new Error('刪除客戶失敗'); return r.json(); },

  async createQuote(payload){ const r = await this.request('/api/quotes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); if(!r.ok) throw new Error('建立報價失敗'); return r.json(); },
  async updateQuote(id,payload){ const r = await this.request('/api/quotes/' + id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); if(!r.ok) throw new Error('更新報價失敗'); return r.json(); },
  async listQuotes(){ const r = await this.request('/api/quotes'); if(!r.ok) throw new Error('載入報價失敗'); return r.json(); },
  async getQuote(id){ const r = await this.request('/api/quotes/' + id); if(!r.ok) throw new Error('載入報價失敗'); return r.json(); },
  async nextQuoteNo(){ const r = await this.request('/api/quotes/next-no'); if(!r.ok) throw new Error('取得報價單號失敗'); return r.json(); },

  async createContract(payload){ const r = await this.request('/api/contracts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); if(!r.ok) throw new Error('建立合約失敗'); return r.json(); },
  async updateContract(id,payload){ const r = await this.request('/api/contracts/' + id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); if(!r.ok) throw new Error('更新合約失敗'); return r.json(); },
  async listContracts(){ const r = await this.request('/api/contracts'); if(!r.ok) throw new Error('載入合約失敗'); return r.json(); },
  async getContract(id){ const r = await this.request('/api/contracts/' + id); if(!r.ok) throw new Error('載入合約失敗'); return r.json(); },

  async createAcceptance(payload){ const r = await this.request('/api/acceptances',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); if(!r.ok) throw new Error('建立驗收單失敗'); return r.json(); },
  async updateAcceptance(id,payload){ const r = await this.request('/api/acceptances/' + id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); if(!r.ok) throw new Error('更新驗收單失敗'); return r.json(); },
  async listAcceptances(){ const r = await this.request('/api/acceptances'); if(!r.ok) throw new Error('載入驗收單失敗'); return r.json(); },
  async getAcceptance(id){ const r = await this.request('/api/acceptances/' + id); if(!r.ok) throw new Error('載入驗收單失敗'); return r.json(); }
};
function money(v){ return Number(v || 0).toLocaleString('zh-TW', {maximumFractionDigits:0}); }
function nl2br(s){ return (s || '').replace(/\n/g, '<br>'); }
function splitLines(s){ return (s || '').split('\n').filter(Boolean); }
function qs(name){ return new URL(location.href).searchParams.get(name) || ''; }
function requireLogin(){ if(!localStorage.getItem('yt_token')){ location.href='/login.html'; return false; } return true; }
function logout(){ localStorage.removeItem('yt_token'); localStorage.removeItem('yt_user'); location.href='/login.html'; }
function active(path){ return location.pathname.endsWith(path); }
function topActions(extra=''){ return `<div class="actions">${extra}<button class="secondary" onclick="logout()">登出</button></div>`; }
function layout(title, content){
  if (!requireLogin()) return '';
  return `<div class="wrap"><div class="topbar"><div class="brand"><h1>昱拓弱電有限公司｜公司文件系統 V4</h1><p>${title}</p></div>${topActions('<button onclick="window.print()">列印 / 另存 PDF</button>')}</div><div class="layout"><aside class="sidebar"><div class="nav-title">主功能</div><div class="menu"><a class="btn ${active('index.html')||location.pathname==='/'?'active':''}" href="/index.html">首頁</a><a class="btn ${active('clients.html')?'active':''}" href="/clients.html">客戶資料</a><div class="nav-title" style="margin-top:14px;">新增</div><div class="submenu"><a class="btn ${active('quote.html')?'active':''}" href="/quote.html">報價單</a><a class="btn ${active('contracts.html')?'active':''}" href="/contracts.html">維護合約</a><a class="btn ${active('acceptance.html')?'active':''}" href="/acceptance.html">驗收單</a></div><div class="nav-title" style="margin-top:10px;">查詢</div><div class="submenu"><a class="btn ${active('quotes.html')?'active':''}" href="/quotes.html">報價單</a><a class="btn ${active('contracts_history.html')?'active':''}" href="/contracts_history.html">維護合約</a><a class="btn ${active('acceptances_history.html')?'active':''}" href="/acceptances_history.html">驗收單</a></div></div><div style="margin-top:16px" class="info-box">客戶資料建立後，報價單、維護合約、驗收單皆可直接套用。所有新增表單均支援修改與存檔。</div></aside><main class="main">${content}</main></div></div>`;
}
