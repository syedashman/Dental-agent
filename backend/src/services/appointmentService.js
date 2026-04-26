/**
 * Appointment Service
 * Handles CRUD operations for appointments with Google Calendar sync
 * Prevents double bookings and manages availability
 */

const Appointment = require('../models/Appointment');
const Dentist = require('../models/Dentist');
const Clinic = require('../models/Clinic');
const logger = require('../utils/logger');
const googleCalendarService = require('./googleCalendarService');

/**
 * Get available time slots for a dentist on a specific date
 */
const getAvailableSlots = async (clinicId, dentistId, date, duration = 30) => {
  const clinic = await Clinic.findById(clinicId);
  const dentist = await Dentist.findById(dentistId);

  if (!clinic || !dentist) {
    throw new Error('Clinic or dentist not found');
  }

  // Get day of week
  const requestedDate = new Date(date);
  const dayName = requestedDate.toLocaleDateString('en-US', { weekday: 'lowercase' }).toLowerCase();
  // Fix: toLocaleDateString returns full name
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = days[requestedDate.getDay()];

  // Check clinic working hours
  const clinicHours = clinic.workingHours?.find((h) => h.day === dayOfWeek);
  if (!clinicHours?.isOpen) {
    return { slots: [], message: 'Clinic is closed on this day' };
  }

  // Check dentist availability
  const dentistAvailability = dentist.availability?.find((a) => a.day === dayOfWeek);
  if (dentistAvailability && !dentistAvailability.isAvailable) {
    return { slots: [], message: 'Dentist is not available on this day' };
  }

  // Check vacation
  if (dentist.isOnVacation(date)) {
    return { slots: [], message: 'Dentist is on vacation on this date' };
  }

  // Determine working hours (dentist overrides clinic)
  const startTime = dentistAvailability?.startTime || clinicHours.openTime;
  const endTime = dentistAvailability?.endTime || clinicHours.closeTime;
  const slotDuration = dentist.slotDuration || clinic.slotDuration || duration;
  const bufferTime = dentist.bufferTime || clinic.bufferTime || 10;

  // Get existing appointments for this dentist on this date
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const existingAppointments = await Appointment.find({
    dentistId,
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['pending', 'confirmed'] },
  });

  const bookedTimes = existingAppointments.map((a) => ({
    start: a.startTime,
    end: a.endTime,
  }));

  // Generate all possible slots
  const allSlots = generateTimeSlots(startTime, endTime, slotDuration, bufferTime);

  // Filter out booked slots
  const availableSlots = allSlots.filter((slot) => {
    return !bookedTimes.some((booked) => {
      return (
        slot.start < booked.end &&
        slot.end > booked.start
      );
    });
  });

  // Filter out past slots if date is today
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const filteredSlots = requestedDate.getTime() === today.getTime()
    ? availableSlots.filter((slot) => {
        const [h, m] = slot.start.split(':').map(Number);
        const slotTime = new Date();
        slotTime.setHours(h, m, 0, 0);
        return slotTime > now;
      })
    : availableSlots;

  return {
    slots: filteredSlots,
    dentist: dentist.fullName,
    date: requestedDate.toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      timeZone: clinic.timezone,
    }),
    totalAvailable: filteredSlots.length,
  };
};

/**
 * Generate time slots between start and end times
 */
const generateTimeSlots = (startTime, endTime, duration, buffer) => {
  const slots = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  while (currentMinutes + duration <= endMinutes) {
    const startH = Math.floor(currentMinutes / 60);
    const startM = currentMinutes % 60;
    const endM_total = currentMinutes + duration;
    const endH_slot = Math.floor(endM_total / 60);
    const endM_slot = endM_total % 60;

    slots.push({
      start: `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`,
      end: `${String(endH_slot).padStart(2, '0')}:${String(endM_slot).padStart(2, '0')}`,
      label: formatTimeLabel(`${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`),
    });

    currentMinutes += duration + buffer;
  }

  return slots;
};

/**
 * Format time to 12-hour format for display
 */
const formatTimeLabel = (time24) => {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

/**
 * Create a new appointment with double-booking prevention
 */
const createAppointment = async (data) => {
  const clinic = await Clinic.findById(data.clinicId);
  const dentist = await Dentist.findById(data.dentistId);

  if (!clinic || !dentist) throw new Error('Clinic or dentist not found');

  const slotDuration = dentist.slotDuration || clinic.slotDuration || 30;

  // Calculate end time
  const [h, m] = data.startTime.split(':').map(Number);
  const endMinutes = h * 60 + m + slotDuration;
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

  const appointment = new Appointment({
    clinicId: data.clinicId,
    dentistId: data.dentistId,
    patientId: data.patientId,
    appointmentDate: new Date(data.appointmentDate),
    startTime: data.startTime,
    endTime,
    duration: slotDuration,
    service: data.service,
    notes: data.notes,
    status: 'confirmed',
    bookedVia: data.bookedVia || 'whatsapp',
  });

  await appointment.save(); // Pre-save hook handles double-booking check

  // Sync to Google Calendar if connected
  if (clinic.googleCalendar?.isConnected) {
    try {
      const eventId = await googleCalendarService.createEvent(appointment, clinic, dentist);
      appointment.googleEventId = eventId;
      appointment.calendarSynced = true;
      await appointment.save();
    } catch (calError) {
      logger.warn('Google Calendar sync failed (non-critical):', calError.message);
    }
  }

  logger.info(`Appointment created: ${appointment._id} for ${dentist.fullName}`);
  return appointment;
};

/**
 * Reschedule an existing appointment
 */
const rescheduleAppointment = async (appointmentId, newDate, newTime, patientId) => {
  const original = await Appointment.findOne({
    _id: appointmentId,
    patientId,
    status: { $in: ['pending', 'confirmed'] },
  });

  if (!original) throw new Error('Appointment not found or already cancelled');

  // Create new appointment
  const newAppointment = await createAppointment({
    clinicId: original.clinicId,
    dentistId: original.dentistId,
    patientId: original.patientId,
    appointmentDate: newDate,
    startTime: newTime,
    service: original.service,
    notes: original.notes,
    bookedVia: original.bookedVia,
  });

  // Mark original as rescheduled
  original.status = 'rescheduled';
  original.rescheduledTo = newAppointment._id;
  await original.save();

  newAppointment.rescheduledFrom = original._id;
  await newAppointment.save();

  // Update Google Calendar if synced
  if (original.googleEventId) {
    try {
      const clinic = await Clinic.findById(original.clinicId);
      await googleCalendarService.deleteEvent(original.googleEventId, clinic);
    } catch (e) {
      logger.warn('Failed to delete old calendar event:', e.message);
    }
  }

  return newAppointment;
};

/**
 * Cancel an appointment
 */
const cancelAppointment = async (appointmentId, patientId, reason = '') => {
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    patientId,
    status: { $in: ['pending', 'confirmed'] },
  });

  if (!appointment) throw new Error('Appointment not found or already cancelled');

  appointment.status = 'cancelled';
  appointment.cancellationReason = reason;
  appointment.cancelledBy = 'patient';
  appointment.cancelledAt = new Date();
  await appointment.save();

  // Remove from Google Calendar
  if (appointment.googleEventId) {
    try {
      const clinic = await Clinic.findById(appointment.clinicId);
      await googleCalendarService.deleteEvent(appointment.googleEventId, clinic);
    } catch (e) {
      logger.warn('Failed to delete calendar event:', e.message);
    }
  }

  return appointment;
};

/**
 * Get patient's upcoming appointments
 */
const getPatientAppointments = async (patientId, limit = 5) => {
  return Appointment.find({
    patientId,
    appointmentDate: { $gte: new Date() },
    status: { $in: ['pending', 'confirmed'] },
  })
    .sort({ appointmentDate: 1 })
    .limit(limit)
    .populate('dentistId', 'firstName lastName title')
    .lean();
};

module.exports = {
  getAvailableSlots,
  createAppointment,
  rescheduleAppointment,
  cancelAppointment,
  getPatientAppointments,
  generateTimeSlots,
  formatTimeLabel,
};
