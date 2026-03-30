document.getElementById('app').innerHTML = `
<h2>設備</h2>
<div>
  <label>編號</label><input id="code">
  <label>名稱</label><input id="name">
  <label>規格</label><textarea id="spec"></textarea>
  <label>成本</label><input id="cost" value="0">
  <label>售價</label><input id="price" value="0">
  <label>利潤</label><input id="profit" readonly>
  <label>備註</label><textarea id="note"></textarea>
  <label>連結</label><input id="link">
  <button id="saveBtn">新增 / 存檔</button>
</div>
<div id="list"></div>
`;

function calcProfit(){
  const cost = Number(document.getElementById('cost').value || 0);
  const price = Number(document.getElementById('price').value || 0);
  document.getElementById('profit').value = price - cost;
}
document.getElementById('cost').addEventListener('input', calcProfit);
document.getElementById('price').addEventListener('input', calcProfit);
calcProfit();

/*
後端欄位：
code, name, spec, cost, price, profit, note, link
profit = price - cost
*/