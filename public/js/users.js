
document.getElementById('app').innerHTML = layout('帳戶管理', `
<div class="split">
  <div class="form-panel">
    <h2 style="margin-top:0;">帳戶表單 <span class="badge" id="userMode">新增</span></h2>
    <input type="hidden" id="userId">
    <label>帳號</label><input id="username">
    <label>密碼</label><input id="password" type="password">
    <label>權限</label><select id="role"><option value="admin">管理者</option><option value="viewer">檢視者</option></select>
    <div class="toolbar"><button id="saveUserBtn">存檔</button><button class="light" id="clearUserBtn">清空欄位</button></div>
  </div>
  <div class="list-panel"><div id="userList"></div></div>
</div>`);
if (API.role() !== 'admin') { app.innerHTML = layout('帳戶管理', '<div class="info-box">僅管理者可使用此功能。</div>'); }
let rows = [];
async function loadUsers(){ rows = await API.getUsers(); render(); }
function render(){ userList.innerHTML = rows.length ? rows.map(u => `<div class="list-item"><strong>${u.username}</strong><div>權限：${u.role==='admin'?'管理者':'檢視者'}</div><div class="toolbar" style="margin-top:10px;margin-bottom:0;"><button onclick="editUser(${u.id})">修改</button></div></div>`).join('') : '<div class="muted">目前尚無帳戶資料。</div>'; }
function clearForm(){ userId.value=''; username.value=''; password.value=''; role.value='viewer'; userMode.textContent='新增'; }
function editUser(id){ const row = rows.find(x => x.id === id); if(!row) return; userId.value = row.id; username.value = row.username; password.value=''; role.value = row.role; userMode.textContent='修改'; window.scrollTo({top:0, behavior:'smooth'}); }
async function saveUser(){ const payload = { username: username.value.trim(), password: password.value, role: role.value }; if(!payload.username){ alert('請輸入帳號'); return; } if(!userId.value && !payload.password){ alert('新增帳戶請輸入密碼'); return; } if(userId.value) await API.updateUser(userId.value, payload); else await API.createUser(payload); alert('帳戶已存檔'); clearForm(); await loadUsers(); }
saveUserBtn.addEventListener('click', saveUser); clearUserBtn.addEventListener('click', clearForm); loadUsers().catch(err => alert(err.message));
