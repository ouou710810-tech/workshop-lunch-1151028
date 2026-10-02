const MEALS = ['原味飯糰', '海苔香鬆', '泡菜飯糰', '鮪魚飯糰', '烤肉飯糰', '辣豬肉飯糰'];
const ORDER_KEY = 'workshop-lunch-preview-orders-v1';
const form = document.querySelector('#order-form');
const attendee = document.querySelector('#attendee');
const onsiteName = document.querySelector('#onsite-name');
const message = document.querySelector('#form-message');

function readOrders() {
  try { return JSON.parse(localStorage.getItem(ORDER_KEY) || '[]'); }
  catch { return []; }
}
function maskName(name) {
  const chars = [...name.trim()];
  if (chars.length < 2) return chars[0] ? `${chars[0]}O` : '訪客';
  return `${chars[0]}O${chars.slice(2).join('')}`;
}
function renderOrders() {
  const orders = readOrders();
  document.querySelector('#total-count').textContent = `${orders.length} 份`;
  document.querySelector('#meal-stats').innerHTML = MEALS.map(meal => {
    const count = orders.filter(order => order.meal === meal).length;
    return `<div class="stat"><strong>${meal}</strong><span>${count} 份</span></div>`;
  }).join('');
  document.querySelector('#public-orders').innerHTML = orders.slice().reverse().map(order =>
    `<div class="order-row"><span>${escapeHtml(maskName(order.name))}</span><span>${escapeHtml(order.meal)}</span><time>${new Date(order.createdAt).toLocaleString('zh-TW', {hour:'2-digit',minute:'2-digit'})}</time></div>`
  ).join('');
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

attendee.addEventListener('change', () => {
  const show = attendee.value === 'onsite';
  onsiteName.hidden = !show;
  onsiteName.required = show;
  if (show) onsiteName.focus();
});

form.addEventListener('submit', event => {
  event.preventDefault();
  const meal = form.elements.meal.value;
  const name = attendee.value === 'onsite' ? onsiteName.value.trim() : attendee.value;
  if (!meal || !name) {
    message.textContent = '請選擇姓名與一種主餐。';
    return;
  }
  const order = {name, meal, createdAt: new Date().toISOString()};
  const orders = readOrders();
  const previous = orders.findIndex(item => item.name === name);
  if (previous >= 0) orders[previous] = order;
  else orders.push(order);
  localStorage.setItem(ORDER_KEY, JSON.stringify(orders));
  document.querySelector('#receipt-text').textContent = `${name}，已選擇「${meal}」。此預覽資料只保存在目前瀏覽器。`;
  document.querySelector('#thanks').hidden = false;
  message.textContent = '';
  renderOrders();
  document.querySelector('#thanks').scrollIntoView({behavior:'smooth', block:'center'});
});

document.querySelector('#download-card').addEventListener('click', () => {
  const meal = form.elements.meal.value;
  const name = attendee.value === 'onsite' ? onsiteName.value.trim() : attendee.value;
  if (!meal || !name) return;
  const canvas = document.querySelector('#order-canvas');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f6f3eb'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#315142'; ctx.beginPath(); ctx.roundRect(48, 48, 804, 1104, 34); ctx.fill();
  ctx.fillStyle = '#e8c69b'; ctx.font = '600 30px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('115 年度教師專業成長研習', 450, 165);
  ctx.fillStyle = '#fffefa'; ctx.font = '800 66px sans-serif';
  ctx.fillText('捕夢網製作', 450, 290);
  ctx.font = '500 34px sans-serif'; ctx.fillStyle = '#e3e9e1';
  ctx.fillText('飯糰點餐卡', 450, 350);
  ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(150, 410); ctx.lineTo(750, 410); ctx.stroke();
  ctx.fillStyle = '#f5e9d6'; ctx.font = '500 32px sans-serif'; ctx.fillText('點餐人', 450, 510);
  ctx.fillStyle = '#fffefa'; ctx.font = '700 58px sans-serif'; ctx.fillText(name, 450, 600);
  ctx.fillStyle = '#f5e9d6'; ctx.font = '500 32px sans-serif'; ctx.fillText('主餐', 450, 715);
  ctx.fillStyle = '#fffefa'; ctx.font = '700 52px sans-serif'; ctx.fillText(meal, 450, 800);
  ctx.fillStyle = '#e3e9e1'; ctx.font = '500 27px sans-serif';
  ctx.fillText('115.10.28（三） 09:00–12:30', 450, 935);
  ctx.fillStyle = '#e3e9e1'; ctx.font = '400 24px sans-serif'; ctx.fillText('非專研習・捕夢網製作', 450, 1055);
  const link = document.createElement('a');
  link.download = `捕夢網研習點餐卡-${name}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

if (location.protocol.startsWith('http')) {
  const qr = document.createElement('img');
  qr.alt = '網站 QR Code';
  qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=234x234&margin=4&data=${encodeURIComponent(location.href.split('#')[0])}`;
  document.querySelector('#qr-placeholder').replaceChildren(qr);
}
renderOrders();
