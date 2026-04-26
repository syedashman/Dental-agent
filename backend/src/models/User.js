/**
 * User Model - Admin panel users
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['superadmin', 'admin', 'staff'], default: 'admin' },
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic' },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    passwordResetToken: String,
    passwordResetExpiry: Date,
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
