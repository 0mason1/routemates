const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Preview invite info without auth
router.get('/invite/:code', (req, res) => {
  const user = db.prepare('SELECT id, name, city FROM users WHERE invite_code = ?').get(req.params.code);
  if (!user) return res.status(404).json({ error: 'Invite not found' });
  res.json(user);
});

// Accept invite (create friendship both ways)
router.post('/invite/:code/accept', auth, (req, res) => {
  const inviter = db.prepare('SELECT id, name FROM users WHERE invite_code = ?').get(req.params.code);
  if (!inviter) return res.status(404).json({ error: 'Invite not found' });
  if (inviter.id === req.user.id) return res.status(400).json({ error: 'Cannot befriend yourself' });

  const already = db.prepare('SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?').get(req.user.id, inviter.id);
  if (already) return res.status(409).json({ error: 'Already friends' });

  const insertFriendship = db.prepare('INSERT OR IGNORE INTO friendships (id, user_id, friend_id) VALUES (?, ?, ?)');
  const add = db.transaction(() => {
    insertFriendship.run(uuidv4(), req.user.id, inviter.id);
    insertFriendship.run(uuidv4(), inviter.id, req.user.id);
  });
  add();
  res.json({ success: true, friend: inviter });
});

// List my friends
router.get('/', auth, (req, res) => {
  const friends = db.prepare(`
    SELECT u.id, u.name, u.city, u.city_lat, u.city_lng
    FROM friendships f
    JOIN users u ON u.id = f.friend_id
    WHERE f.user_id = ?
    ORDER BY u.name
  `).all(req.user.id);
  res.json(friends);
});

module.exports = router;
