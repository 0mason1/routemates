const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function makeToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

router.post('/signup', async (req, res, next) => {
  try {
    const { name, username, email, password, phone, city, city_lat, city_lng } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
    if (!username) return res.status(400).json({ error: 'username required' });
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: 'Username must be 3-20 characters, letters/numbers/underscores only' });
    if (!city || city_lat == null || city_lng == null) return res.status(400).json({ error: 'Home address is required' });

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) return res.status(409).json({ error: 'Email already in use' });

    const existingUsername = await query('SELECT id FROM users WHERE username=$1', [username]);
    if (existingUsername.rows.length) return res.status(409).json({ error: 'Username already taken' });

    const id = uuidv4();
    const invite_code = uuidv4().replace(/-/g, '').slice(0, 12);
    const password_hash = bcrypt.hashSync(password, 10);

    await query(
      'INSERT INTO users (id, name, username, email, password_hash, phone, invite_code, city, city_lat, city_lng) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [id, name, username, email, password_hash, phone || null, invite_code, city || null, city_lat || null, city_lng || null]
    );

    const user = (await query('SELECT id,name,username,email,phone,city,city_lat,city_lng,invite_code FROM users WHERE id=$1', [id])).rows[0];
    res.json({ token: makeToken(user), user });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await query('SELECT * FROM users WHERE email=$1', [email]);
    const user = result.rows[0];
    if (!user || !bcrypt.compareSync(password, user.password_hash))
      return res.status(401).json({ error: 'Invalid credentials' });
    const { password_hash, ...safe } = user;
    res.json({ token: makeToken(safe), user: safe });
  } catch (err) { next(err); }
});

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = (await query('SELECT id,name,username,email,phone,city,city_lat,city_lng,invite_code FROM users WHERE id=$1', [req.user.id])).rows[0];
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (err) { next(err); }
});

router.delete('/me', authMiddleware, async (req, res, next) => {
  try {
    await query('DELETE FROM users WHERE id=$1', [req.user.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.put('/city', authMiddleware, async (req, res, next) => {
  try {
    const { city, city_lat, city_lng } = req.body;
    if (!city || city_lat == null || city_lng == null) return res.status(400).json({ error: 'city, city_lat, city_lng required' });
    await query('UPDATE users SET city=$1, city_lat=$2, city_lng=$3 WHERE id=$4', [city, city_lat, city_lng, req.user.id]);
    const user = (await query('SELECT id,name,username,email,phone,city,city_lat,city_lng,invite_code FROM users WHERE id=$1', [req.user.id])).rows[0];
    res.json(user);
  } catch (err) { next(err); }
});

module.exports = router;
