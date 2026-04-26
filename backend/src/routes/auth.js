/**
 * Auth Routes
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Clinic = require('../models/Clinic');
const googleCalendarService = require('../services/googleCalendarService');
const logger = require('../utils/logger');

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, isActive: true }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role, clinicId: user.clinicId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, clinicId: user.clinicId },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Register (superadmin only in production)
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').notEmpty().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password, name, clinicId, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const user = await User.create({ email, password, name, clinicId, role: role || 'admin' });

    res.status(201).json({ message: 'User created', userId: user._id });
  } catch (error) {
    logger.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Google Calendar OAuth - initiate
router.get('/google/calendar/:clinicId', async (req, res) => {
  const url = googleCalendarService.getAuthUrl(req.params.clinicId);
  res.redirect(url);
});

// Google Calendar OAuth - callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state: clinicId } = req.query;
    await googleCalendarService.exchangeCodeForTokens(code, clinicId);
    res.send('<script>window.close();</script>Google Calendar connected! You can close this tab.');
  } catch (error) {
    res.status(500).send('Failed to connect Google Calendar: ' + error.message);
  }
});

module.exports = router;
