/**
 * Database Seeder
 * Creates initial clinic, admin user, and sample dentists
 * Run: node src/utils/seed.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Clinic = require('../models/Clinic');
const Dentist = require('../models/Dentist');
const User = require('../models/User');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([Clinic.deleteMany({}), Dentist.deleteMany({}), User.deleteMany({})]);
    console.log('🗑️ Cleared existing data');

    // Create clinic
    const clinic = await Clinic.create({
      name: 'Bright Smiles Dental Clinic',
      address: { street: '123 Main Street', city: 'Karachi', country: 'Pakistan', postalCode: '74000' },
      phone: '+92-21-1234567',
      email: 'info@brightsmiles.pk',
      timezone: 'Asia/Karachi',
      language: 'en',
      currency: 'PKR',
      whatsapp: {
        phoneNumber: process.env.DEFAULT_WHATSAPP_NUMBER || '+923372113410',
        isActive: false, // Set to true after configuring API keys
        provider: 'meta',
      },
      services: [
        { name: 'General Checkup', duration: 30, price: 500 },
        { name: 'Teeth Cleaning', duration: 45, price: 1500 },
        { name: 'Filling', duration: 60, price: 2000 },
        { name: 'Root Canal', duration: 90, price: 8000 },
        { name: 'Teeth Whitening', duration: 60, price: 5000 },
        { name: 'Tooth Extraction', duration: 30, price: 1000 },
        { name: 'Braces Consultation', duration: 45, price: 500 },
        { name: 'X-Ray', duration: 15, price: 800 },
      ],
      slotDuration: 30,
      bufferTime: 10,
      welcomeMessage: 'Hello! Welcome to *Bright Smiles Dental Clinic* 🦷\n\nI\'m your virtual assistant. I can help you:\n• 📅 Book an appointment\n• 🔄 Reschedule or cancel\n• ❓ Answer dental questions\n\nHow can I help you today?',
    });
    console.log(`✅ Clinic created: ${clinic.name} (ID: ${clinic._id})`);

    // Create dentists
    const dentists = await Dentist.create([
      {
        clinicId: clinic._id,
        firstName: 'Sarah',
        lastName: 'Ahmed',
        title: 'Dr.',
        specialization: ['General Dentistry', 'Cosmetic Dentistry'],
        qualifications: ['BDS', 'FCPS (Orthodontics)'],
        experience: 8,
        bio: 'Dr. Sarah specializes in cosmetic dentistry and has helped hundreds of patients achieve their perfect smile.',
        availability: [
          { day: 'monday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
          { day: 'tuesday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
          { day: 'wednesday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
          { day: 'thursday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
          { day: 'friday', isAvailable: true, startTime: '09:00', endTime: '13:00' },
          { day: 'saturday', isAvailable: false },
        ],
      },
      {
        clinicId: clinic._id,
        firstName: 'Omar',
        lastName: 'Khan',
        title: 'Dr.',
        specialization: ['Endodontics', 'Oral Surgery'],
        qualifications: ['BDS', 'MCPS'],
        experience: 12,
        bio: 'Dr. Omar is an expert in root canals and oral surgery with over 12 years of experience.',
        availability: [
          { day: 'monday', isAvailable: true, startTime: '10:00', endTime: '18:00' },
          { day: 'tuesday', isAvailable: true, startTime: '10:00', endTime: '18:00' },
          { day: 'wednesday', isAvailable: false },
          { day: 'thursday', isAvailable: true, startTime: '10:00', endTime: '18:00' },
          { day: 'friday', isAvailable: true, startTime: '10:00', endTime: '14:00' },
          { day: 'saturday', isAvailable: true, startTime: '10:00', endTime: '14:00' },
        ],
      },
    ]);
    console.log(`✅ Created ${dentists.length} dentists`);

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@brightsmiles.pk',
      password: 'Admin123!',  // Change this immediately after setup!
      role: 'admin',
      clinicId: clinic._id,
    });
    console.log(`✅ Admin user created: ${adminUser.email}`);

    console.log('\n🎉 Database seeded successfully!');
    console.log('─'.repeat(50));
    console.log(`Clinic ID: ${clinic._id}`);
    console.log(`Admin Email: admin@brightsmiles.pk`);
    console.log(`Admin Password: Admin123! (CHANGE THIS IMMEDIATELY)`);
    console.log('─'.repeat(50));

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
  }
};

seed();
