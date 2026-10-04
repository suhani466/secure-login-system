const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const crypto = require('crypto');
const path = require('path');

const app = express();
const db = new DatabaseSync('users.db');
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  failed_attempts INTEGER DEFAULT 0,
  locked_until INTEGER DEFAULT 0
)`);

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000; // 15 minutes
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 12);

// Security headers (CSP etc.)
const csp = helmet.contentSecurityPolicy.getDefaultDirectives();
delete csp['upgrade-insecure-requests'];
app.use(helmet({ contentSecurityPolicy: { directives: csp } }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ---- Validation ----
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function validEmail(e) { return typeof e === 'string' && e.length <= 254 && EMAIL_RE.test(e); }
function validPassword(p) {
  return typeof p === 'string' && p.length >= 8 && p.length <= 72 && /[A-Za-z]/.test(p) && /\d/.test(p);
}

// ---- Auth middleware ----
function auth(req, res, next) {
  try {
    req.user = jwt.verify(req.cookies.token, JWT_SECRET);
    next();
  } catch {
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Not authenticated' });
    return res.redirect('/login.html');
  }
}

// ---- Routes ----
app.post('/api/register', async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const { password } = req.body;
  if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!validPassword(password))
    return res.status(400).json({ error: 'Password must be 8-72 characters with at least one letter and one number.' });
  try {
    const hash = await bcrypt.hash(password, 12);
    db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, hash);
    res.status(201).json({ message: 'Account created. You can log in now.' });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(409).json({ error: 'Email already registered.' });
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.post('/api/login', async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const { password } = req.body;
  if (!validEmail(email) || typeof password !== 'string' || password.length > 72)
    return res.status(400).json({ error: 'Invalid email or password.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH); // same timing as a real user
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  if (user.locked_until > Date.now()) {
    const mins = Math.ceil((user.locked_until - Date.now()) / 60000);
    return res.status(429).json({ error: `Too many failed attempts. Try again in ${mins} minute(s).` });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    const attempts = user.failed_attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      db.prepare('UPDATE users SET failed_attempts = 0, locked_until = ? WHERE id = ?').run(Date.now() + LOCK_MS, user.id);
      return res.status(429).json({ error: 'Too many failed attempts. Account locked for 15 minutes.' });
    }
    db.prepare('UPDATE users SET failed_attempts = ? WHERE id = ?').run(attempts, user.id);
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  db.prepare('UPDATE users SET failed_attempts = 0, locked_until = 0 WHERE id = ?').run(user.id);
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 1000,
  });
  res.json({ message: 'Logged in.' });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out.' });
});

app.get('/api/me', auth, (req, res) => res.json({ email: req.user.email }));
app.get('/dashboard', auth, (req, res) => res.sendFile(path.join(__dirname, 'views', 'dashboard.html')));
app.get('/', (req, res) => res.redirect('/login.html'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running at http://localhost:${PORT}`));
