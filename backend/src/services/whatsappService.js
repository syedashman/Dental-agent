/**
 * WhatsApp Service
 * Handles sending/receiving messages via Meta Cloud API or Twilio
 * Automatically selects provider based on clinic configuration
 */

const axios = require('axios');
const logger = require('../utils/logger');

const META_API_VERSION = 'v20.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * Send a text message via Meta WhatsApp Cloud API
 */
const sendMetaMessage = async (to, message, clinic) => {
  const phoneNumberId = clinic?.whatsapp?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = clinic?.whatsapp?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp Meta API credentials not configured');
  }

  const url = `${META_BASE_URL}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to.replace(/^\+/, ''), // Remove + prefix for API
    type: 'text',
    text: {
      preview_url: false,
      body: message,
    },
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });

  logger.info(`Meta WhatsApp message sent to ${to}:`, response.data?.messages?.[0]?.id);
  return response.data;
};

/**
 * Send a text message via Twilio WhatsApp API
 */
const sendTwilioMessage = async (to, message, clinic) => {
  const twilio = require('twilio');
  const accountSid = clinic?.whatsapp?.twilioSid || process.env.TWILIO_ACCOUNT_SID;
  const authToken = clinic?.whatsapp?.twilioToken || process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }

  const client = twilio(accountSid, authToken);

  const result = await client.messages.create({
    from: fromNumber,
    to: `whatsapp:${to}`,
    body: message,
  });

  logger.info(`Twilio WhatsApp message sent to ${to}:`, result.sid);
  return result;
};

/**
 * Main function to send WhatsApp message
 * Auto-selects provider based on clinic config
 */
const sendMessage = async (to, message, clinic = null) => {
  try {
const provider = process.env.WHATSAPP_PROVIDER || clinic?.whatsapp?.provider || 'twilio';
    if (provider === 'twilio') {
      return await sendTwilioMessage(to, message, clinic);
    } else {
      return await sendMetaMessage(to, message, clinic);
    }
  } catch (error) {
    logger.error(`Failed to send WhatsApp message to ${to}:`, error.message);
    throw error;
  }
};

/**
 * Send a template message (for confirmations, reminders)
 * Note: Template messages must be pre-approved by Meta
 */
const sendTemplateMessage = async (to, templateName, components, clinic = null) => {
  const phoneNumberId = clinic?.whatsapp?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = clinic?.whatsapp?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  const languageCode = clinic?.language || 'en';

  const payload = {
    messaging_product: 'whatsapp',
    to: to.replace(/^\+/, ''),
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  };

  const response = await axios.post(
    `${META_BASE_URL}/${phoneNumberId}/messages`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
};

/**
 * Download media (voice notes, images) from Meta servers
 */
const downloadMedia = async (mediaId, clinic = null) => {
  const accessToken = clinic?.whatsapp?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

  // Step 1: Get media URL
  const urlResponse = await axios.get(`${META_BASE_URL}/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const mediaUrl = urlResponse.data.url;

  // Step 2: Download the media
  const mediaResponse = await axios.get(mediaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    responseType: 'arraybuffer',
  });

  return {
    data: Buffer.from(mediaResponse.data),
    mimeType: urlResponse.data.mime_type,
  };
};

/**
 * Verify WhatsApp webhook signature (Meta security)
 */
const verifyWebhookSignature = (payload, signature) => {
  const crypto = require('crypto');
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  
  if (!appSecret) {
    logger.warn('WHATSAPP_APP_SECRET not set - skipping signature verification');
    return true;
  }

  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex');

  return `sha256=${expectedSignature}` === signature;
};

/**
 * Mark message as read (shows double blue tick)
 */
const markAsRead = async (messageId, clinic = null) => {
  const phoneNumberId = clinic?.whatsapp?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = clinic?.whatsapp?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

  try {
    await axios.post(
      `${META_BASE_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  } catch (error) {
    // Non-critical - log but don't throw
    logger.warn('Failed to mark message as read:', error.message);
  }
};

module.exports = {
  sendMessage,
  sendTemplateMessage,
  downloadMedia,
  verifyWebhookSignature,
  markAsRead,
};
