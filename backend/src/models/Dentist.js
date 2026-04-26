/**
 * Dentist Model
 * Individual dentist with their own schedule and specializations
 */

const mongoose = require('mongoose');

const dentistAvailabilitySchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  },
  isAvailable: { type: Boolean, default: true },
  startTime: { type: String, default: '09:00' },
  endTime: { type: String, default: '17:00' },
  maxPatients: { type: Number, default: 15 }, // Max patients per day
});

const dentistSchema = new mongoose.Schema(
  {
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },

    // Personal info
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String },
    phone: { type: String },
    photo: { type: String }, // URL to photo

    // Professional info
    title: { type: String, default: 'Dr.' },
    specialization: [String], // e.g., ['Orthodontics', 'Root Canal']
    qualifications: [String], // e.g., ['BDS', 'FCPS']
    licenseNumber: { type: String },
    experience: { type: Number }, // years of experience
    bio: { type: String },

    // Schedule
    availability: [dentistAvailabilitySchema],
    vacations: [
      {
        startDate: Date,
        endDate: Date,
        reason: String,
      },
    ],

    // Google Calendar
    googleCalendarId: { type: String },

    // Appointment slot settings
    slotDuration: { type: Number }, // Override clinic default (minutes)
    bufferTime: { type: Number },   // Override clinic default (minutes)

    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 }, // Order in UI
  },
  { timestamps: true }
);

// Virtual for full name
dentistSchema.virtual('fullName').get(function () {
  return `${this.title} ${this.firstName} ${this.lastName}`;
});

dentistSchema.set('toJSON', { virtuals: true });

// Check if dentist is on vacation for a given date
dentistSchema.methods.isOnVacation = function (date) {
  return this.vacations.some(
    (v) => new Date(date) >= new Date(v.startDate) && new Date(date) <= new Date(v.endDate)
  );
};

dentistSchema.index({ clinicId: 1, isActive: 1 });

module.exports = mongoose.model('Dentist', dentistSchema);
