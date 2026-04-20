const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db/database');
const auth = require('../middleware/auth');
const webpush = require('web-push');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:admin@routemates.app', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
}

async function sendPushToUser(userId, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return;
  try {
    const subs = (await query('SELECT subscription FROM push_subscriptions WHERE user_id=$1', [userId])).rows;
    for (const row of subs) {
      try { await webpush.sendNotification(row.subscription, JSON.stringify(payload)); } catch {}
    }
  } catch {}
}

const router = express.Router();

router.get('/:friendId', auth, async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const isFriend = (await query(
      'SELECT id FROM friendships WHERE (user_id=$1 AND friend_id=$2) OR (user_id=$2 AND friend_id=$1)',
      [req.user.id, friendId]
    )).rows[0];
    if (!isFriend) return res.status(403).json({ error: 'Not friends' });

    const msgs = (await query(`
      SELECT m.*, u.name as sender_name
      FROM direct_messages m JOIN users u ON u.id=m.sender_id
      WHERE (m.sender_id=$1 AND m.recipient_id=$2) OR (m.sender_id=$2 AND m.recipient_id=$1)
      ORDER BY m.created_at ASC
    `, [req.user.id, friendId])).rows;
    res.json(msgs);
  } catch (err) { next(err); }
});

router.post('/:friendId', auth, async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'message required' });

    const isFriend = (await query(
      'SELECT id FROM friendships WHERE (user_id=$1 AND friend_id=$2) OR (user_id=$2 AND friend_id=$1)',
      [req.user.id, friendId]
    )).rows[0];
    if (!isFriend) return res.status(403).json({ error: 'Not friends' });

    const id = uuidv4();
    await query('INSERT INTO direct_messages (id,sender_id,recipient_id,message) VALUES ($1,$2,$3,$4)',
      [id, req.user.id, friendId, message.trim()]);

    const sender = (await query('SELECT name FROM users WHERE id=$1', [req.user.id])).rows[0];
    sendPushToUser(friendId, { title: `${sender.name}`, body: message.trim(), url: '/friends' });

    res.json({ id, sender_id: req.user.id, recipient_id: friendId, sender_name: sender.name, message: message.trim(), created_at: new Date() });
  } catch (err) { next(err); }
});

module.exports = router;
