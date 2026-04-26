/**
 * AI Agent Service
 * Supports Groq (FREE), Claude, OpenAI, and Gemini
 */

const logger = require('../utils/logger');
const appointmentService = require('./appointmentService');

// Initialize Groq (FREE - recommended)
let groqClient = null;
if (process.env.GROQ_API_KEY) {
  const Groq = require('groq-sdk');
  groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// Initialize Gemini
let geminiModel = null;
if (process.env.GEMINI_API_KEY) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

// Initialize Anthropic
let anthropic = null;
if (process.env.ANTHROPIC_API_KEY) {
  const Anthropic = require('@anthropic-ai/sdk');
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// Initialize OpenAI
let openai = null;
if (process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const buildSystemPrompt = (clinic, patient) => {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: clinic.timezone,
  });

  const services = clinic.services?.map((s) => `• ${s.name} (${s.duration} mins)`).join('\n') ||
    '• General Checkup\n• Teeth Cleaning\n• Fillings\n• Root Canal\n• Teeth Whitening';

  return `You are ${clinic.aiPersonality || 'a friendly and professional dental receptionist'} for ${clinic.name}.

Today is ${today} (${clinic.timezone}).

YOUR CAPABILITIES:
- Book new dental appointments
- Reschedule existing appointments
- Cancel appointments
- Check available time slots
- Answer general dental FAQs
- Provide clinic information

CLINIC INFORMATION:
- Name: ${clinic.name}
- Phone: ${clinic.phone || 'Not available'}
- Address: ${[clinic.address?.street, clinic.address?.city, clinic.address?.country].filter(Boolean).join(', ')}
- WhatsApp: ${clinic.whatsapp?.phoneNumber}

AVAILABLE SERVICES:
${services}

WORKING HOURS:
${clinic.workingHours?.filter(h => h.isOpen).map(h => `• ${h.day.charAt(0).toUpperCase() + h.day.slice(1)}: ${h.openTime} - ${h.closeTime}`).join('\n') || 'Monday-Friday: 9AM-5PM'}

PATIENT: ${patient.name || 'New Patient'} (${patient.phone})

INSTRUCTIONS:
1. Be warm, empathetic, and professional
2. Always confirm appointment details before booking
3. When booking, collect: patient name, preferred date, preferred time, service needed
4. If a slot is unavailable, suggest the nearest 3 alternatives
5. Send confirmation with: date, time, dentist name, confirmation code
6. For cancellations, ask for confirmation and reason
7. Handle questions in the patient language if possible
8. For dental emergencies, advise them to visit immediately or call emergency line
9. Never give specific medical diagnoses - refer to dentist for that
10. Keep responses concise and WhatsApp-friendly

RESPONSE FORMAT:
- Use simple, clear language
- Use emojis sparingly (😊 🦷 📅 ✅)
- Keep messages under 300 words

DENTAL FAQ KNOWLEDGE:
- Toothache: Rinse with warm salt water, visit dentist ASAP
- Broken tooth: Save pieces, avoid hard foods, see dentist within 24hrs
- Bleeding gums: Often sign of gingivitis, schedule cleaning
- General checkup: Recommended every 6 months`;
};

const processMessage = async (message, patient, clinic) => {
  try {
    const provider = process.env.AI_PROVIDER || 'groq';
    const conversationHistory = patient.getRecentContext(10);
    const systemPrompt = buildSystemPrompt(clinic, patient);
    let aiResponse = '';

    if (provider === 'groq' && groqClient) {
      // ── Groq (FREE - super fast) ───────────────────
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message },
      ];
      const response = await groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 500,
        messages,
      });
      aiResponse = response.choices[0].message.content;

    } else if (provider === 'gemini' && geminiModel) {
      // ── Gemini ─────────────────────────────────────
      const history = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Understood! I am ready to help patients book dental appointments.' }] },
        ...conversationHistory.map((msg) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })),
      ];
      const chat = geminiModel.startChat({ history });
      const result = await chat.sendMessage(message);
      aiResponse = result.response.text();

    } else if (provider === 'claude' && anthropic) {
      // ── Claude ─────────────────────────────────────
      const messages = [...conversationHistory, { role: 'user', content: message }];
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: systemPrompt,
        messages,
      });
      aiResponse = response.content[0].text;

    } else if (openai) {
      // ── OpenAI ─────────────────────────────────────
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message },
      ];
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        max_tokens: 500,
        messages,
      });
      aiResponse = response.choices[0].message.content;

    } else {
      throw new Error('No AI provider configured!');
    }

    logger.info(`AI (${provider}) response generated for ${patient.phone}`);
    return aiResponse;

  } catch (error) {
    logger.error('AI processing error:', error);
    if (error.status === 429) {
      return "I'm receiving too many requests right now. Please try again in a moment. 😊";
    }
    return "I'm having a little technical difficulty. Please try again or call us directly. Sorry! 🙏";
  }
};

const processBookingFromConversation = async (patient, clinic, bookingData) => {
  try {
    const appointment = await appointmentService.createAppointment({
      clinicId: clinic._id,
      patientId: patient._id,
      dentistId: bookingData.dentistId,
      appointmentDate: bookingData.date,
      startTime: bookingData.time,
      service: bookingData.service,
      notes: bookingData.notes,
    });

    return {
      success: true,
      appointment,
      message: `✅ Appointment confirmed!\n\n📅 Date: ${appointment.getFormattedDateTime(clinic.timezone).date}\n⏰ Time: ${appointment.startTime}\n🦷 Service: ${appointment.service}\n🔑 Confirmation: ${appointment.confirmationCode}\n\nSee you soon! 😊`,
    };
  } catch (error) {
    logger.error('Booking failed:', error);
    return {
      success: false,
      message: "Sorry, couldn't complete the booking. Please try a different time.",
    };
  }
};

const processVoiceNote = async (audioBuffer, mimeType = 'audio/ogg') => {
  if (!openai) throw new Error('OpenAI API key required for voice transcription');
  const { Readable } = require('stream');
  const stream = Readable.from(audioBuffer);
  stream.path = 'voice.ogg';
  const transcription = await openai.audio.transcriptions.create({
    file: stream, model: 'whisper-1',
  });
  return transcription.text;
};

const extractBookingIntent = (aiResponse) => {
  const response = aiResponse.toLowerCase();
  return {
    isBooking: response.includes('confirm') && response.includes('appointment'),
    isCancelling: response.includes('cancel') && response.includes('confirm'),
    isRescheduling: response.includes('reschedule') && response.includes('confirm'),
    isCheckingSlots: response.includes('available') && response.includes('slot'),
  };
};

module.exports = {
  processMessage,
  processBookingFromConversation,
  processVoiceNote,
  extractBookingIntent,
};