const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function makeToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

router.post('/signup', (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already in use' });

  const id = uuidv4();
  const invite_code = uuidv4().replace(/-/g, '').slice(0, 12);
  const password_hash = bcrypt.hashSync(password, 10);

  db.prepare(
    'INSERT INTO users (id, name, email, password_hash, phone, invite_code) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, name, email, password_hash, phone || null, invite_code);

  const user = db.prepare('SELECT id, name, email, phone, city, city_lat, city_lng, invite_code FROM users WHERE id = ?').get(id);
  res.json({ token: makeToken(user), user });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Invalid credentials' });

  const { password_hash, ...safe } = user;
  res.json({ token: makeToken(safe), user: safe });
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, name, email, phone, city, city_lat, city_lng, invite_code FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

router.put('/city', authMiddleware, (req, res) => {
  const { city, city_lat, city_lng } = req.body;
  if (!city || city_lat == null || city_lng == null) return res.status(400).json({ error: 'city, city_lat, city_lng required' });
  db.prepare('UPDATE users SET city = ?, city_lat = ?, city_lng = ? WHERE id = ?').run(city, city_lat, city_lng, req.user.id);
  const user = db.prepare('SELECT id, name, email, phone, city, city_lat, city_lng, invite_code FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

module.exports = router;
