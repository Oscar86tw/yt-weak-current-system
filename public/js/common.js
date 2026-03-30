function toggleMenu(id){
  const el = document.getElementById(id);
  if (el) el.classList.toggle('hidden');
}

async function nextDocNo(type){
  const r = await fetch('/api/serials/next?type=' + encodeURIComponent(type), {
    headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('yt_token') || '') }
  });
  if (!r.ok) throw new Error('取得文件編號失敗');
  return r.json();
}

/*
使用方式：
報價單頁：
const next = await nextDocNo('quote');
docNo.value = next.doc_no;

合約單頁：
const next = await nextDocNo('contract');

驗收單頁：
const next = await nextDocNo('acceptance');
*/