const MEALS = ['原味飯糰', '海苔香鬆', '泡菜飯糰', '鮪魚飯糰', '烤肉飯糰', '辣豬肉飯糰'];
const ONSITE_ID_KEY = 'workshop-lunch-onsite-id-v1';
const BACKEND = window.WORKSHOP_BACKEND;
const form = document.querySelector('#order-form');
const attendee = document.querySelector('#attendee');
const onsiteName = document.querySelector('#onsite-name');
const message = document.querySelector('#form-message');

function onsiteId() {
  let id = localStorage.getItem(ONSITE_ID_KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(ONSITE_ID_KEY, id); }
  return id;
}
async function ordersRequest(action, options = {}) {
  const headers = { apikey: BACKEND.publishableKey, Authorization: `Bearer ${BACKEND.publishableKey}` };
  if (options.body) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${BACKEND.functionsUrl}?action=${action}`, {
    method: options.method || 'GET', headers, body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || '連線失敗，請稍後重試。');
  return result;
}
async function renderOrders() {
  const count = document.querySelector('#total-count');
  try {
  const orders = await ordersRequest('public');
  count.textContent = `${orders.length} 份`;
  document.querySelector('#total-count').textContent = `${orders.length} 份`;
  document.querySelector('#meal-stats').innerHTML = MEALS.map(meal => {
    const count = orders.filter(order => order.meal === meal).length;
    return `<div class="stat"><strong>${meal}</strong><span>${count} 份</span></div>`;
  }).join('');
  document.querySelector('#public-orders').innerHTML = orders.map(order =>
    `<div class="order-row"><span>${escapeHtml(order.name)}</span><span>${escapeHtml(order.meal)}</span><time>${new Date(order.created_at).toLocaleString('zh-TW', {hour:'2-digit',minute:'2-digit'})}</time></div>`
  ).join('');
  } catch (error) {
    count.textContent = '無法同步';
    document.querySelector('#public-orders').innerHTML = `<p class="order-row">${escapeHtml(error.message)}</p>`;
  }
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

form.addEventListener('submit', async event => {
  event.preventDefault();
  const meal = form.elements.meal.value;
  const name = attendee.value === 'onsite' ? onsiteName.value.trim() : attendee.value;
  if (!meal || !name) {
    message.textContent = '請選擇姓名與一種主餐。';
    return;
  }
  const button = form.querySelector('.submit-button');
  button.disabled = true;
  button.textContent = '正在送出…';
  try {
  await ordersRequest('submit', {method:'POST', body:{name, meal, onsiteId:attendee.value === 'onsite' ? onsiteId() : null}});
  document.querySelector('#receipt-text').textContent = `${name}，已選擇「${meal}」。訂單已加入共用清單，公開名單會遮蔽姓名。`;
  document.querySelector('#thanks').hidden = false;
  message.textContent = '';
  await renderOrders();
  document.querySelector('#thanks').scrollIntoView({behavior:'smooth', block:'center'});
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
    button.innerHTML = '送出我的選擇 <span>→</span>';
  }
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
  ctx.fillText('海苔飯捲點餐卡', 450, 350);
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
window.setInterval(renderOrders, 20000);
