/**
 * Appointment Routes
 */

const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const appointmentService = require('../services/appointmentService');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

// Get all appointments (admin)
router.get('/', authenticate, async (req, res) => {
  try {
    const { clinicId, dentistId, date, status, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (req.user.role !== 'superadmin') query.clinicId = req.user.clinicId;
    if (clinicId && req.user.role === 'superadmin') query.clinicId = clinicId;
    if (dentistId) query.dentistId = dentistId;
    if (status) query.status = status;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: start, $lte: end };
    }

    const appointments = await Appointment.find(query)
      .populate('patientId', 'name phone')
      .populate('dentistId', 'firstName lastName title')
      .sort({ appointmentDate: 1, startTime: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(query);

    res.json({ appointments, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error('Get appointments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get available slots
router.get('/slots', authenticate, async (req, res) => {
  try {
    const { clinicId, dentistId, date } = req.query;
    if (!dentistId || !date) return res.status(400).json({ error: 'dentistId and date required' });
    
    const slots = await appointmentService.getAvailableSlots(
      clinicId || req.user.clinicId,
      dentistId,
      date
    );
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create appointment (admin)
router.post('/', authenticate, async (req, res) => {
  try {
    const appointment = await appointmentService.createAppointment({
      ...req.body,
      clinicId: req.body.clinicId || req.user.clinicId,
      bookedVia: 'admin',
    });
    res.status(201).json(appointment);
  } catch (error) {
    if (error.code === 'DOUBLE_BOOKING') return res.status(409).json({ error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Update appointment status
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).populate('patientId', 'name phone').populate('dentistId', 'firstName lastName title');
    
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel appointment
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    
    appointment.status = 'cancelled';
    appointment.cancelledBy = 'clinic';
    appointment.cancelledAt = new Date();
    appointment.cancellationReason = req.body.reason;
    await appointment.save();

    res.json({ message: 'Appointment cancelled', appointment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Today's appointments
router.get('/today', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await Appointment.find({
      clinicId: req.user.clinicId,
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: { $in: ['confirmed', 'completed'] },
    })
      .populate('patientId', 'name phone')
      .populate('dentistId', 'firstName lastName title')
      .sort({ startTime: 1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
