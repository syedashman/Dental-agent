/**
 * Dentist Routes
 */

const express = require('express');
const router = express.Router();
const Dentist = require('../models/Dentist');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

router.get('/', authenticate, async (req, res) => {
  try {
    const clinicId = req.user.role === 'superadmin' ? req.query.clinicId : req.user.clinicId;
    const dentists = await Dentist.find({ clinicId, isActive: true }).sort('displayOrder firstName');
    res.json(dentists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const dentist = await Dentist.findById(req.params.id);
    if (!dentist) return res.status(404).json({ error: 'Dentist not found' });
    res.json(dentist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const dentist = await Dentist.create({
      ...req.body,
      clinicId: req.body.clinicId || req.user.clinicId,
    });
    res.status(201).json(dentist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const dentist = await Dentist.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!dentist) return res.status(404).json({ error: 'Dentist not found' });
    res.json(dentist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await Dentist.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Dentist deactivated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
