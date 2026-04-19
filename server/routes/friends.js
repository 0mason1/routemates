const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/invite/:code', async (req, res, next) => {
  try {
    const result = await query('SELECT id,name,city FROM users WHERE invite_code=$1', [req.params.code]);
    if (!result.rows.length) return res.status(404).json({ error: 'Invite not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

router.post('/invite/:code/accept', auth, async (req, res, next) => {
  try {
    const inviter = (await query('SELECT id,name FROM users WHERE invite_code=$1', [req.params.code])).rows[0];
    if (!inviter) return res.status(404).json({ error: 'Invite not found' });
    if (inviter.id === req.user.id) return res.status(400).json({ error: 'Cannot befriend yourself' });

    const already = await query('SELECT id FROM friendships WHERE user_id=$1 AND friend_id=$2', [req.user.id, inviter.id]);
    if (already.rows.length) return res.status(409).json({ error: 'Already friends' });

    await query('INSERT INTO friendships (id,user_id,friend_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [uuidv4(), req.user.id, inviter.id]);
    await query('INSERT INTO friendships (id,user_id,friend_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [uuidv4(), inviter.id, req.user.id]);

    res.json({ success: true, friend: inviter });
  } catch (err) { next(err); }
});

router.get('/', auth, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT u.id,u.name,u.city,u.city_lat,u.city_lng
      FROM friendships f
      JOIN users u ON u.id=f.friend_id
      WHERE f.user_id=$1
      ORDER BY u.name
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) { next(err); }
});

module.exports = router;
