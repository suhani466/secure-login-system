async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { ok: r.ok, data: await r.json() };
}
const msg = document.getElementById('msg');
function show(text, good) { msg.textContent = text; msg.className = good ? 'good' : 'bad'; }

const reg = document.getElementById('registerForm');
if (reg) reg.addEventListener('submit', async (e) => {
  e.preventDefault();
  const { ok, data } = await post('/api/register', { email: email.value, password: password.value });
  show(data.message || data.error, ok);
  if (ok) setTimeout(() => (location.href = '/login.html'), 1200);
});

const login = document.getElementById('loginForm');
if (login) login.addEventListener('submit', async (e) => {
  e.preventDefault();
  const { ok, data } = await post('/api/login', { email: email.value, password: password.value });
  if (ok) location.href = '/dashboard'; else show(data.error, false);
});

const who = document.getElementById('who');
if (who) fetch('/api/me').then(r => r.ok ? r.json() : Promise.reject()).then(d => (who.textContent = d.email)).catch(() => (location.href = '/login.html'));

const out = document.getElementById('logout');
if (out) out.addEventListener('click', async () => { await post('/api/logout', {}); location.href = '/login.html'; });
