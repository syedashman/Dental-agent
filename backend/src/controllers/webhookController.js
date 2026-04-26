/**
 * Webhook Controller
 * Handles incoming WhatsApp messages from Meta Cloud API or Twilio
 * This is the heart of the agent - processes every incoming message
 */

const Patient = require('../models/Patient');
const Clinic = require('../models/Clinic');
const aiAgentService = require('../services/aiAgentService');
const whatsappService = require('../services/whatsappService');
const appointmentService = require('../services/appointmentService');
const logger = require('../utils/logger');

/**
 * Verify webhook (GET request from Meta to validate endpoint)
 */
const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    logger.info('WhatsApp webhook verified successfully');
    return res.status(200).send(challenge);
  }

  logger.warn('WhatsApp webhook verification failed');
  return res.status(403).json({ error: 'Forbidden' });
};

/**
 * Handle incoming WhatsApp messages (POST from Meta)
 */
const handleMetaWebhook = async (req, res) => {
  // Respond immediately to Meta (within 5 seconds required)
  res.status(200).json({ status: 'ok' });

  try {
    const body = JSON.parse(req.body);

    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const messages = value?.messages || [];
        const contacts = value?.contacts || [];

        for (const message of messages) {
          await processIncomingMessage(message, contacts, value.metadata);
        }
      }
    }
  } catch (error) {
    logger.error('Webhook processing error:', error);
  }
};

/**
 * Handle Twilio webhook (POST)
 */
const handleTwilioWebhook = async (req, res) => {
  try {
    const from = req.body.From?.replace('whatsapp:', '');
    const body = req.body.Body;
    const mediaUrl = req.body.MediaUrl0;
    const mediaContentType = req.body.MediaContentType0;

    if (!from) {
      return res.status(400).send('<Response></Response>');
    }

    // Find or default to first active clinic
    const clinic = await getClinicForNumber(req.body.To?.replace('whatsapp:', ''));

    // Process text or media message
    const messageData = {
      from,
      type: mediaUrl ? 'audio' : 'text',
      text: body ? { body } : undefined,
      audio: mediaUrl ? { id: null, url: mediaUrl, mime_type: mediaContentType } : undefined,
    };

await processIncomingMessage(messageData, [], { phone_number_id: null });
    res.status(200).send('<Response></Response>');
  } catch (error) {
    logger.error('Twilio webhook error:', error);
    res.status(500).send('<Response></Response>');
  }
};

/**
 * Process an incoming message object from Meta
 */
const processIncomingMessage = async (message, contacts, metadata) => {
  const from = message.from;
  const messageId = message.id;
  const messageType = message.type;

  logger.info(`Incoming ${messageType} message from ${from}`);

  try {
    // Find the clinic based on the WhatsApp phone number
    const clinic = await getClinicForNumber(metadata?.phone_number_id);

    if (!clinic) {
      logger.error(`No clinic found for phone number ID: ${metadata?.phone_number_id}`);
      return;
    }

    // Mark message as read
    await whatsappService.markAsRead(messageId, clinic);

    // Find or create patient
    let patient = await Patient.findOne({ clinicId: clinic._id, phone: from });
    if (!patient) {
      const contact = contacts?.find((c) => c.wa_id === from);
      patient = await Patient.create({
        clinicId: clinic._id,
        phone: from,
        name: contact?.profile?.name || null,
      });
      logger.info(`New patient created: ${from}`);
    }

    if (patient.isBlocked) {
      logger.warn(`Blocked patient ${from} attempted to message`);
      return;
    }

    let userMessageText = '';

    // Handle different message types
    if (messageType === 'text') {
      userMessageText = message.text?.body || '';
    } else if (messageType === 'audio' && process.env.ENABLE_VOICE_NOTES === 'true') {
      // Handle voice notes via Whisper
      try {
        const media = await whatsappService.downloadMedia(message.audio?.id, clinic);
        userMessageText = await aiAgentService.processVoiceNote(media.data, media.mimeType);
        logger.info(`Voice note transcribed: "${userMessageText}"`);
      } catch (err) {
        logger.error('Voice transcription failed:', err.message);
        await whatsappService.sendMessage(from, "Sorry, I couldn't understand your voice note. Please type your message instead. 😊", clinic);
        return;
      }
    } else if (messageType === 'image') {
      await whatsappService.sendMessage(from, 'Thanks for the image! For appointment bookings, please type your request. How can I help you? 😊', clinic);
      return;
    } else {
      await whatsappService.sendMessage(from, 'I can handle text and voice messages. Please type your request. 😊', clinic);
      return;
    }

    if (!userMessageText.trim()) return;

    // Add to conversation history
    patient.addToConversation('user', userMessageText);
    await patient.save();

    // Check for special commands
    const lowerMsg = userMessageText.toLowerCase().trim();

    if (lowerMsg === 'stop' || lowerMsg === 'unsubscribe') {
      patient.optedIn = false;
      await patient.save();
      await whatsappService.sendMessage(from, "You've been unsubscribed from our messages. Reply 'START' to re-subscribe.", clinic);
      return;
    }

    if (lowerMsg === 'start' || lowerMsg === 'subscribe') {
      patient.optedIn = true;
      await patient.save();
      await whatsappService.sendMessage(from, clinic.welcomeMessage || 'Welcome back! How can we help you today? 😊', clinic);
      return;
    }

    // If this is first message, send welcome
    if (patient.conversationHistory.length === 1) {
      const welcomeMsg = clinic.welcomeMessage || `Hello! Welcome to *${clinic.name}*! 😊\n\nI'm your virtual dental assistant. I can help you:\n• 📅 Book an appointment\n• 🔄 Reschedule an appointment\n• ❌ Cancel an appointment\n• ❓ Answer dental questions\n\nHow can I help you today?`;
      
      // Add welcome to history and send
      patient.addToConversation('assistant', welcomeMsg);
      await patient.save();
      await whatsappService.sendMessage(from, welcomeMsg, clinic);
      return;
    }

    // Process with AI Agent
    const aiResponse = await aiAgentService.processMessage(userMessageText, patient, clinic);

    // Add AI response to conversation history
    patient.addToConversation('assistant', aiResponse);
    await patient.save();

    // Send the response
    await whatsappService.sendMessage(from, aiResponse, clinic);

    logger.info(`Response sent to ${from}`);
  } catch (error) {
    logger.error(`Error processing message from ${from}:`, error);
    
    // Send fallback message on critical errors
    try {
      const clinic = await Clinic.findOne({ isActive: true });
      if (clinic) {
        await whatsappService.sendMessage(
          from,
          "Sorry, I'm having a technical issue right now. Please try again in a moment or call us directly. 🙏",
          clinic
        );
      }
    } catch (fallbackError) {
      logger.error('Failed to send error fallback:', fallbackError.message);
    }
  }
};

/**
 * Find clinic by WhatsApp phone number ID or number
 */
const getClinicForNumber = async (phoneNumberIdOrNumber) => {
  if (!phoneNumberIdOrNumber) {
    // Default: return first active clinic
    return Clinic.findOne({ isActive: true });
  }

  // Try by phone number ID first
  let clinic = await Clinic.findOne({
    'whatsapp.phoneNumberId': phoneNumberIdOrNumber,
    isActive: true,
  });

  if (!clinic) {
    // Try by phone number
    clinic = await Clinic.findOne({
      'whatsapp.phoneNumber': phoneNumberIdOrNumber,
      isActive: true,
    });
  }

  if (!clinic) {
    // Fallback to any active clinic
    clinic = await Clinic.findOne({ isActive: true });
  }

  return clinic;
};

module.exports = { verifyWebhook, handleMetaWebhook, handleTwilioWebhook };
