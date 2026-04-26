/**
 * Appointment Model
 * Core booking record with full lifecycle tracking
 */

const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    // References
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
    dentistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dentist', required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },

    // Appointment details
    appointmentDate: { type: Date, required: true },
    startTime: { type: String, required: true },  // HH:MM
    endTime: { type: String, required: true },    // HH:MM
    duration: { type: Number, required: true },  // minutes

    // Service
    service: { type: String, required: true },   // e.g., "Teeth Cleaning"
    serviceId: { type: mongoose.Schema.Types.ObjectId }, // Reference to clinic service
    notes: { type: String },                      // Patient notes or complaints

    // Status tracking
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'rescheduled'],
      default: 'confirmed',
    },
    cancellationReason: { type: String },
    cancelledBy: { type: String, enum: ['patient', 'clinic', 'system'] },
    cancelledAt: { type: Date },

    // Rescheduling
    rescheduledFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    rescheduledTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },

    // Google Calendar sync
    googleEventId: { type: String },
    calendarSynced: { type: Boolean, default: false },

    // Notifications sent
    confirmationSent: { type: Boolean, default: false },
    reminderSent: { type: Boolean, default: false },
    reminderSentAt: { type: Date },
    followUpSent: { type: Boolean, default: false },

    // Booking channel
    bookedVia: {
      type: String,
      enum: ['whatsapp', 'web', 'phone', 'admin'],
      default: 'whatsapp',
    },

    // Unique confirmation code
    confirmationCode: {
      type: String,
      unique: true,
      default: () => Math.random().toString(36).substring(2, 8).toUpperCase(),
    },
  },
  { timestamps: true }
);

// Indexes for common queries
appointmentSchema.index({ clinicId: 1, appointmentDate: 1, status: 1 });
appointmentSchema.index({ dentistId: 1, appointmentDate: 1 });
appointmentSchema.index({ patientId: 1, appointmentDate: -1 });
appointmentSchema.index({ confirmationCode: 1 });

// Check for double booking before saving
appointmentSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('startTime') || this.isModified('appointmentDate')) {
    const conflict = await this.constructor.findOne({
      dentistId: this.dentistId,
      appointmentDate: this.appointmentDate,
      status: { $in: ['pending', 'confirmed'] },
      _id: { $ne: this._id },
      $or: [
        { startTime: this.startTime },
        {
          startTime: { $lt: this.endTime },
          endTime: { $gt: this.startTime },
        },
      ],
    });

    if (conflict) {
      const error = new Error('Time slot already booked. Please choose a different time.');
      error.code = 'DOUBLE_BOOKING';
      return next(error);
    }
  }
  next();
});

// Format date for display
appointmentSchema.methods.getFormattedDateTime = function (timezone = 'UTC') {
  const date = new Date(this.appointmentDate);
  return {
    date: date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: timezone }),
    time: this.startTime,
    full: `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: timezone })} at ${this.startTime}`,
  };
};

module.exports = mongoose.model('Appointment', appointmentSchema);
