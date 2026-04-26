/**
 * Webhook Routes - Entry point for WhatsApp messages
 */

const express = require('express');
const router = express.Router();
const { verifyWebhook, handleMetaWebhook, handleTwilioWebhook } = require('../controllers/webhookController');

// Meta WhatsApp Cloud API webhook verification (GET)
router.get('/whatsapp', verifyWebhook);

// Meta WhatsApp Cloud API incoming messages (POST)
router.post('/whatsapp', handleMetaWebhook);

// Twilio WhatsApp webhook
router.post('/whatsapp/twilio', express.urlencoded({ extended: false }), handleTwilioWebhook);

module.exports = router;
