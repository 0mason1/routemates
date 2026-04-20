const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/subscribe', auth, async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription) return res.status(400).json({ error: 'subscription required' });
    const id = uuidv4();
    await query(
      'INSERT INTO push_subscriptions (id, user_id, subscription) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [id, req.user.id, JSON.stringify(subscription)]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/subscribe', auth, async (req, res, next) => {
  try {
    await query('DELETE FROM push_subscriptions WHERE user_id=$1', [req.user.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
