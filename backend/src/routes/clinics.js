const express = require('express');
const router = express.Router();
const Clinic = require('../models/Clinic');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

// Get clinic settings
router.get('/:id', authenticate, async (req, res) => {
  try {
    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) return res.status(404).json({ error: 'Clinic not found' });
    
    // Hide sensitive tokens in response
    const clinicObj = clinic.toObject();
    if (clinicObj.whatsapp) {
      clinicObj.whatsapp.accessToken = clinicObj.whatsapp.accessToken ? '***hidden***' : null;
    }
    if (clinicObj.googleCalendar) {
      clinicObj.googleCalendar.refreshToken = clinicObj.googleCalendar.refreshToken ? '***connected***' : null;
    }
    
    res.json(clinicObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create clinic
router.post('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const clinic = await Clinic.create({ ...req.body, createdBy: req.user.userId });
    res.status(201).json(clinic);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update clinic
router.put('/:id', authenticate, async (req, res) => {
  try {
    // Don't allow overwriting tokens with hidden placeholder
    const update = { ...req.body };
    if (update.whatsapp?.accessToken === '***hidden***') delete update.whatsapp.accessToken;
    if (update.googleCalendar?.refreshToken === '***connected***') delete update.googleCalendar.refreshToken;

    const clinic = await Clinic.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!clinic) return res.status(404).json({ error: 'Clinic not found' });
    res.json(clinic);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update WhatsApp config specifically
router.patch('/:id/whatsapp', authenticate, async (req, res) => {
  try {
    const clinic = await Clinic.findByIdAndUpdate(
      req.params.id,
      { $set: { whatsapp: req.body } },
      { new: true }
    );
    res.json({ message: 'WhatsApp config updated', isActive: clinic.whatsapp.isActive });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all clinics (superadmin)
router.get('/', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const clinics = await Clinic.find({}).select('-whatsapp.accessToken -googleCalendar.refreshToken');
    res.json(clinics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
