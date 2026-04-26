/**
 * Google Calendar Service
 * Manages appointment sync with Google Calendar
 */

const { google } = require('googleapis');
const logger = require('../utils/logger');
const Clinic = require('../models/Clinic');

/**
 * Create OAuth2 client for a specific clinic
 */
const getOAuth2Client = (clinic = null) => {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  if (clinic?.googleCalendar?.refreshToken) {
    client.setCredentials({
      refresh_token: clinic.googleCalendar.refreshToken,
      access_token: clinic.googleCalendar.accessToken,
    });
  }

  return client;
};

/**
 * Generate Google OAuth URL for clinic to authorize
 */
const getAuthUrl = (clinicId) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
    state: clinicId.toString(), // Pass clinic ID to callback
  });
};

/**
 * Exchange authorization code for tokens
 */
const exchangeCodeForTokens = async (code, clinicId) => {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  
  // Save tokens to clinic
  await Clinic.findByIdAndUpdate(clinicId, {
    'googleCalendar.refreshToken': tokens.refresh_token,
    'googleCalendar.accessToken': tokens.access_token,
    'googleCalendar.tokenExpiry': new Date(tokens.expiry_date),
    'googleCalendar.isConnected': true,
  });

  return tokens;
};

/**
 * Create a calendar event for an appointment
 */
const createEvent = async (appointment, clinic, dentist) => {
  try {
    const auth = getOAuth2Client(clinic);
    const calendar = google.calendar({ version: 'v3', auth });

    const appointmentDate = new Date(appointment.appointmentDate);
    const [startH, startM] = appointment.startTime.split(':').map(Number);
    const [endH, endM] = appointment.endTime.split(':').map(Number);

    const startDateTime = new Date(appointmentDate);
    startDateTime.setHours(startH, startM, 0, 0);
    
    const endDateTime = new Date(appointmentDate);
    endDateTime.setHours(endH, endM, 0, 0);

    const event = {
      summary: `${appointment.service} - Patient Appointment`,
      description: [
        `Service: ${appointment.service}`,
        `Dentist: ${dentist.fullName}`,
        `Confirmation Code: ${appointment.confirmationCode}`,
        appointment.notes ? `Notes: ${appointment.notes}` : '',
      ].filter(Boolean).join('\n'),
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: clinic.timezone,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: clinic.timezone,
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'popup', minutes: 15 },
        ],
      },
      colorId: '9', // Blue for dental appointments
    };

    const calendarId = clinic.googleCalendar?.calendarId || dentist.googleCalendarId || 'primary';
    const response = await calendar.events.insert({ calendarId, resource: event });

    logger.info(`Google Calendar event created: ${response.data.id}`);
    return response.data.id;
  } catch (error) {
    logger.error('Google Calendar createEvent error:', error.message);
    throw error;
  }
};

/**
 * Update an existing calendar event
 */
const updateEvent = async (eventId, appointment, clinic, dentist) => {
  try {
    const auth = getOAuth2Client(clinic);
    const calendar = google.calendar({ version: 'v3', auth });

    const appointmentDate = new Date(appointment.appointmentDate);
    const [startH, startM] = appointment.startTime.split(':').map(Number);
    const [endH, endM] = appointment.endTime.split(':').map(Number);

    const startDateTime = new Date(appointmentDate);
    startDateTime.setHours(startH, startM, 0, 0);
    const endDateTime = new Date(appointmentDate);
    endDateTime.setHours(endH, endM, 0, 0);

    const calendarId = clinic.googleCalendar?.calendarId || 'primary';
    
    await calendar.events.patch({
      calendarId,
      eventId,
      resource: {
        start: { dateTime: startDateTime.toISOString(), timeZone: clinic.timezone },
        end: { dateTime: endDateTime.toISOString(), timeZone: clinic.timezone },
      },
    });

    logger.info(`Google Calendar event updated: ${eventId}`);
  } catch (error) {
    logger.error('Google Calendar updateEvent error:', error.message);
    throw error;
  }
};

/**
 * Delete a calendar event (on cancellation)
 */
const deleteEvent = async (eventId, clinic) => {
  try {
    const auth = getOAuth2Client(clinic);
    const calendar = google.calendar({ version: 'v3', auth });
    const calendarId = clinic?.googleCalendar?.calendarId || 'primary';
    
    await calendar.events.delete({ calendarId, eventId });
    logger.info(`Google Calendar event deleted: ${eventId}`);
  } catch (error) {
    if (error.code === 404) {
      logger.warn(`Calendar event ${eventId} not found - already deleted`);
      return;
    }
    throw error;
  }
};

module.exports = {
  getAuthUrl,
  exchangeCodeForTokens,
  createEvent,
  updateEvent,
  deleteEvent,
  getOAuth2Client,
};
