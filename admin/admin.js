import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/+esm';

const {url, publishableKey, functionsUrl} = window.WORKSHOP_BACKEND;
const supabase = createClient(url, publishableKey, {auth:{flowType:'implicit',detectSessionInUrl:true}});
const loginPanel = document.querySelector('#login-panel');
const ordersPanel = document.querySelector('#orders-panel');
const loginMessage = document.querySelector('#login-message');
const adminMessage = document.querySelector('#admin-message');
const MEALS = ['原味飯糰','海苔香鬆','泡菜飯糰','鮪魚飯糰','烤肉飯糰','辣豬肉飯糰'];
let currentOrders = [];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

async function organizerRequest(session) {
  const response = await fetch(`${functionsUrl}?action=organizer`, {
    headers:{apikey:publishableKey,Authorization:`Bearer ${session.access_token}`},
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || '讀取訂單失敗，請稍後重試。');
  return result;
}

function renderOrders(orders) {
  currentOrders = orders;
  document.querySelector('#admin-stats').innerHTML = MEALS.map(meal => {
    const count = orders.filter(order => order.meal === meal).length;
    return `<div class="stat"><strong>${meal}</strong><span>${count} 份</span></div>`;
  }).join('');
  document.querySelector('#admin-orders').innerHTML = orders.map(order =>
    `<tr><td>${escapeHtml(order.name)}</td><td>${escapeHtml(order.meal)}</td><td>${new Date(order.created_at).toLocaleString('zh-TW',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</td></tr>`
  ).join('') || '<tr><td colspan="3">目前還沒有訂單</td></tr>';
}

async function updateSession(session) {
  loginPanel.hidden = !session;
  ordersPanel.hidden = true;
  if (!session) return;
  adminMessage.textContent = '正在同步共用訂單…';
  try {
    renderOrders(await organizerRequest(session));
    loginPanel.hidden = true;
    ordersPanel.hidden = false;
    document.querySelector('#signed-in-as').textContent = `已登入：${session.user.email}`;
    adminMessage.textContent = `共 ${currentOrders.length} 筆訂單；資料每 20 秒自動更新。`;
  } catch (error) {
    await supabase.auth.signOut();
    loginPanel.hidden = false;
    loginMessage.textContent = error.message;
  }
}

document.querySelector('#send-link').addEventListener('click', async event => {
  const button = event.currentTarget;
  button.disabled = true;
  loginMessage.textContent = '正在寄送登入連結…';
  try {
    const email = document.querySelector('#admin-email').value.trim();
    const response = await fetch(`${functionsUrl}?action=send-login`, {
      method:'POST',
      headers:{apikey:publishableKey,Authorization:`Bearer ${publishableKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({email}),
    });
    const result = await response.json().catch(() => ({}));
    loginMessage.textContent = response.ok
      ? `登入連結已寄至 ${email}，請在同一部裝置開啟郵件中的連結。`
      : `${result.error || '寄送失敗。'} 若訊息提到 Redirect URLs，請先依網站說明新增管理頁網址。`;
  } catch (error) {
    loginMessage.textContent = `寄送失敗：${error.message}`;
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#refresh-orders').addEventListener('click', async () => {
  const {data:{session}} = await supabase.auth.getSession();
  if (session) await updateSession(session);
});
document.querySelector('#sign-out').addEventListener('click', async () => { await supabase.auth.signOut(); });
document.querySelector('#download-csv').addEventListener('click', () => {
  const rows = [['點餐人','主餐','更新時間'], ...currentOrders.map(order => [order.name,order.meal,new Date(order.created_at).toLocaleString('zh-TW')])];
  const csv = '\uFEFF' + rows.map(row => row.map(value => `"${String(value).replaceAll('"','""')}"`).join(',')).join('\r\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  link.download = '非專研習捕夢網製作_點餐彙整.csv';
  link.click();
  URL.revokeObjectURL(link.href);
});

supabase.auth.onAuthStateChange((_event,session) => { updateSession(session); });
supabase.auth.getSession().then(({data:{session}}) => updateSession(session));
window.setInterval(async () => {
  const {data:{session}} = await supabase.auth.getSession();
  if (session) await updateSession(session);
},20000);
