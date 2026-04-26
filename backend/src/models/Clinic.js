/**
 * Clinic Model - Represents a dental clinic
 * Supports multi-clinic setup with timezone and service configuration
 */

const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },          // e.g., "Teeth Cleaning"
  duration: { type: Number, required: true },       // minutes
  price: { type: Number },
  description: { type: String },
});

const workingHoursSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true,
  },
  isOpen: { type: Boolean, default: true },
  openTime: { type: String, default: '09:00' },    // HH:MM format
  closeTime: { type: String, default: '17:00' },
  breakStart: { type: String },                    // Optional break time
  breakEnd: { type: String },
});

const clinicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true }, // URL-friendly identifier
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },
    phone: { type: String },
    email: { type: String },
    website: { type: String },

    // WhatsApp configuration
    whatsapp: {
      phoneNumber: { type: String, default: process.env.DEFAULT_WHATSAPP_NUMBER || '+923372113410' },
      phoneNumberId: String,           // Meta Cloud API
      businessAccountId: String,       // Meta Cloud API
      accessToken: String,             // Encrypted in production
      provider: { type: String, enum: ['meta', 'twilio'], default: 'meta' },
      twilioSid: String,               // Twilio SID (if using Twilio)
      twilioToken: String,             // Twilio token (if using Twilio)
      isActive: { type: Boolean, default: false },
    },

    // Google Calendar integration
    googleCalendar: {
      calendarId: String,
      refreshToken: String,
      accessToken: String,
      tokenExpiry: Date,
      isConnected: { type: Boolean, default: false },
    },

    // Localization
    timezone: { type: String, default: 'Asia/Karachi' },
    language: { type: String, default: 'en' },
    currency: { type: String, default: 'PKR' },

    // Business config
    workingHours: [workingHoursSchema],
    services: [serviceSchema],
    slotDuration: { type: Number, default: 30 }, // minutes per slot
    bufferTime: { type: Number, default: 10 },   // minutes between appointments

    // AI config
    aiPersonality: {
      type: String,
      default: 'friendly and professional dental receptionist',
    },
    welcomeMessage: {
      type: String,
      default: 'Hello! Welcome to our dental clinic. How can I help you today?',
    },
    
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Auto-generate slug from name
clinicSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }
  next();
});

// Default working hours if none provided
clinicSchema.pre('save', function (next) {
  if (this.workingHours.length === 0) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    this.workingHours = days.map((day) => ({
      day,
      isOpen: true,
      openTime: '09:00',
      closeTime: '17:00',
    }));
    // Add Saturday as half day
    this.workingHours.push({ day: 'saturday', isOpen: true, openTime: '09:00', closeTime: '13:00' });
    this.workingHours.push({ day: 'sunday', isOpen: false, openTime: '09:00', closeTime: '17:00' });
  }
  next();
});

module.exports = mongoose.model('Clinic', clinicSchema);
