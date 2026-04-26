/**
 * Scheduler Service
 * Automated reminders, follow-ups, and maintenance tasks
 * Runs on cron schedule
 */

const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Clinic = require('../models/Clinic');
const whatsappService = require('./whatsappService');
const logger = require('../utils/logger');

/**
 * Send appointment reminders (24h before)
 */
const sendReminders = async () => {
  try {
    const reminderHours = parseInt(process.env.REMINDER_HOURS_BEFORE) || 24;
    const now = new Date();
    const reminderWindow = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);
    const reminderWindowEnd = new Date(reminderWindow.getTime() + 60 * 60 * 1000); // 1 hour window

    const appointments = await Appointment.find({
      appointmentDate: {
        $gte: reminderWindow,
        $lte: reminderWindowEnd,
      },
      status: 'confirmed',
      reminderSent: false,
    })
      .populate('patientId')
      .populate('dentistId')
      .populate('clinicId');

    logger.info(`Found ${appointments.length} appointments needing reminders`);

    for (const appointment of appointments) {
      try {
        const { patient, dentist, clinic } = {
          patient: appointment.patientId,
          dentist: appointment.dentistId,
          clinic: appointment.clinicId,
        };

        if (!patient?.phone || patient?.isBlocked) continue;

        const dateStr = new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          timeZone: clinic?.timezone || 'UTC',
        });

        const reminderMessage = `🦷 *Appointment Reminder*\n\nHi ${patient.name || 'there'}! This is a friendly reminder about your upcoming appointment:\n\n📅 *Date:* ${dateStr}\n⏰ *Time:* ${appointment.startTime}\n👨‍⚕️ *Dentist:* ${dentist?.fullName || 'Our dentist'}\n🏥 *Service:* ${appointment.service}\n\nPlease arrive 5 minutes early. If you need to reschedule, reply to this message.\n\nSee you soon! 😊\n\n_${clinic?.name}_`;

        await whatsappService.sendMessage(patient.phone, reminderMessage, clinic);

        appointment.reminderSent = true;
        appointment.reminderSentAt = new Date();
        await appointment.save();

        logger.info(`Reminder sent for appointment ${appointment._id}`);

        // Rate limiting - wait between messages
        await new Promise((r) => setTimeout(r, 1000));
      } catch (err) {
        logger.error(`Failed to send reminder for appointment ${appointment._id}:`, err.message);
      }
    }
  } catch (error) {
    logger.error('Reminder job failed:', error);
  }
};

/**
 * Send follow-up messages after appointments
 */
const sendFollowUps = async () => {
  try {
    const followUpHours = parseInt(process.env.FOLLOWUP_HOURS_AFTER) || 2;
    const now = new Date();
    const followUpWindow = new Date(now.getTime() - followUpHours * 60 * 60 * 1000);
    const followUpWindowStart = new Date(followUpWindow.getTime() - 60 * 60 * 1000);

    const appointments = await Appointment.find({
      appointmentDate: {
        $gte: followUpWindowStart,
        $lte: followUpWindow,
      },
      status: 'confirmed',
      followUpSent: false,
    })
      .populate('patientId')
      .populate('clinicId');

    for (const appointment of appointments) {
      try {
        const { patient, clinic } = {
          patient: appointment.patientId,
          clinic: appointment.clinicId,
        };

        if (!patient?.phone || patient?.isBlocked) continue;

        const followUpMessage = `😊 Hi ${patient.name || 'there'}! We hope your visit at *${clinic?.name}* went well today!\n\nIf you have any concerns about your treatment or questions, feel free to message us here anytime.\n\nDon't forget to:\n• Follow any treatment instructions given\n• Stay hydrated 💧\n• Schedule your next checkup\n\nFor your next appointment, just message us anytime! 🦷✨`;

        await whatsappService.sendMessage(patient.phone, followUpMessage, clinic);

        appointment.followUpSent = true;
        await appointment.save();

        // Mark appointment as completed
        appointment.status = 'completed';
        await appointment.save();

        await new Promise((r) => setTimeout(r, 1000));
      } catch (err) {
        logger.error(`Failed to send follow-up for appointment ${appointment._id}:`, err.message);
      }
    }
  } catch (error) {
    logger.error('Follow-up job failed:', error);
  }
};

/**
 * Clean up old conversation contexts (weekly)
 */
const cleanConversationContexts = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await require('../models/Patient').updateMany(
      { updatedAt: { $lt: thirtyDaysAgo } },
      { 
        $set: { 
          conversationHistory: [],
          conversationState: 'idle',
          pendingBookingData: null,
        } 
      }
    );
    
    logger.info(`Cleaned conversation context for ${result.modifiedCount} stale patients`);
  } catch (error) {
    logger.error('Context cleanup failed:', error);
  }
};

/**
 * Mark no-show appointments (past appointments still 'confirmed')
 */
const markNoShows = async () => {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const result = await Appointment.updateMany(
      {
        appointmentDate: { $lt: twoHoursAgo },
        status: 'confirmed',
      },
      { $set: { status: 'no_show' } }
    );

    if (result.modifiedCount > 0) {
      logger.info(`Marked ${result.modifiedCount} appointments as no-show`);
    }
  } catch (error) {
    logger.error('No-show marking failed:', error);
  }
};

/**
 * Start all scheduled jobs
 */
const startScheduler = () => {
  // Reminder check every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    logger.debug('Running reminder check...');
    await sendReminders();
  });

  // Follow-up check every hour
  cron.schedule('0 * * * *', async () => {
    logger.debug('Running follow-up check...');
    await sendFollowUps();
  });

  // Mark no-shows every 2 hours
  cron.schedule('0 */2 * * *', async () => {
    await markNoShows();
  });

  // Weekly context cleanup (Sunday at 2 AM)
  cron.schedule('0 2 * * 0', async () => {
    logger.info('Running weekly context cleanup...');
    await cleanConversationContexts();
  });

  logger.info('✅ All scheduled jobs started');
};

module.exports = { startScheduler, sendReminders, sendFollowUps };
