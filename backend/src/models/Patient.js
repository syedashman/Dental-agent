/**
 * Patient Model
 * Stores patient information and conversation context
 */

const mongoose = require('mongoose');

const conversationMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  messageType: { type: String, enum: ['text', 'voice', 'image'], default: 'text' },
});

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    phone: { type: String, required: true, index: true }, // WhatsApp number
    email: { type: String },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other'] },

    // Which clinic this patient belongs to
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },

    // Medical notes (non-sensitive summary)
    notes: { type: String },
    allergies: [String],
    preferredDentist: { type: mongoose.Schema.Types.ObjectId, ref: 'Dentist' },

    // Conversation context for AI (rolling window of last N messages)
    conversationHistory: [conversationMessageSchema],
    conversationState: {
      type: String,
      enum: ['idle', 'booking', 'rescheduling', 'cancelling', 'faq'],
      default: 'idle',
    },
    pendingBookingData: { type: mongoose.Schema.Types.Mixed }, // Temp data during booking flow

    // Language preference (auto-detected or set by patient)
    language: { type: String, default: 'en' },

    // Stats
    totalAppointments: { type: Number, default: 0 },
    lastVisit: { type: Date },
    isBlocked: { type: Boolean, default: false }, // Block spam/abusive users

    // WhatsApp opt-in status
    optedIn: { type: Boolean, default: true },
    optedInAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound index for clinic + phone lookup
patientSchema.index({ clinicId: 1, phone: 1 }, { unique: true });

// Keep conversation history to last 20 messages to manage context window
patientSchema.methods.addToConversation = function (role, content, messageType = 'text') {
  this.conversationHistory.push({ role, content, messageType });
  if (this.conversationHistory.length > 20) {
    this.conversationHistory = this.conversationHistory.slice(-20);
  }
};

// Get recent conversation for AI context (last 10 messages)
patientSchema.methods.getRecentContext = function (limit = 10) {
  return this.conversationHistory.slice(-limit).map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
};

module.exports = mongoose.model('Patient', patientSchema);
