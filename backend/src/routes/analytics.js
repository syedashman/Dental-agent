/**
 * Analytics Routes
 */
const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const { authenticate } = require('../middleware/auth');

router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const clinicId = req.user.clinicId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      todayCount,
      weekCount,
      monthCount,
      totalPatients,
      cancelledThisMonth,
      completedThisMonth,
      upcomingToday,
    ] = await Promise.all([
      Appointment.countDocuments({ clinicId, appointmentDate: { $gte: today, $lt: tomorrow } }),
      Appointment.countDocuments({ clinicId, appointmentDate: { $gte: sevenDaysAgo }, status: { $in: ['confirmed', 'completed'] } }),
      Appointment.countDocuments({ clinicId, appointmentDate: { $gte: thirtyDaysAgo }, status: { $in: ['confirmed', 'completed'] } }),
      Patient.countDocuments({ clinicId }),
      Appointment.countDocuments({ clinicId, appointmentDate: { $gte: thirtyDaysAgo }, status: 'cancelled' }),
      Appointment.countDocuments({ clinicId, appointmentDate: { $gte: thirtyDaysAgo }, status: 'completed' }),
      Appointment.find({ clinicId, appointmentDate: { $gte: today, $lt: tomorrow }, status: { $in: ['confirmed', 'pending'] } })
        .populate('patientId', 'name phone')
        .populate('dentistId', 'firstName lastName title')
        .sort('startTime')
        .limit(10),
    ]);

    // Monthly appointments by day (last 30 days)
    const monthlyData = await Appointment.aggregate([
      { $match: { clinicId: require('mongoose').Types.ObjectId.createFromHexString(clinicId.toString()), appointmentDate: { $gte: thirtyDaysAgo }, status: { $in: ['confirmed', 'completed'] } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Service breakdown
    const serviceBreakdown = await Appointment.aggregate([
      { $match: { clinicId: require('mongoose').Types.ObjectId.createFromHexString(clinicId.toString()), appointmentDate: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$service', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    res.json({
      summary: {
        todayAppointments: todayCount,
        weekAppointments: weekCount,
        monthAppointments: monthCount,
        totalPatients,
        cancellationRate: monthCount > 0 ? Math.round((cancelledThisMonth / (monthCount + cancelledThisMonth)) * 100) : 0,
        completionRate: monthCount > 0 ? Math.round((completedThisMonth / monthCount) * 100) : 0,
      },
      upcomingToday,
      monthlyData,
      serviceBreakdown,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
