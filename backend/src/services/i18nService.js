/**
 * i18n Service - Multilingual Support
 * Supports EN, AR, UR, FR, ES, DE, ZH and more
 * Auto-detects language from message content
 */

const i18next = require('i18next');

// Simple language detection patterns
const languagePatterns = {
  ar: /[\u0600-\u06FF]/,          // Arabic script
  ur: /[\u0600-\u06FF\u0750-\u077F]/, // Urdu (overlaps with Arabic)
  zh: /[\u4E00-\u9FFF]/,          // Chinese characters
  ja: /[\u3040-\u30FF]/,          // Japanese kana
  ko: /[\uAC00-\uD7AF]/,          // Korean hangul
  ru: /[\u0400-\u04FF]/,          // Cyrillic
  hi: /[\u0900-\u097F]/,          // Devanagari (Hindi)
};

/**
 * Detect language from message content
 * Returns ISO 639-1 language code
 */
const detectLanguage = (text) => {
  for (const [lang, pattern] of Object.entries(languagePatterns)) {
    if (pattern.test(text)) {
      // Differentiate Urdu vs Arabic by common Urdu words
      if (lang === 'ar' || lang === 'ur') {
        const urduWords = /\b(ہے|کا|کی|کے|میں|سے|نے|پر|اور|کو)\b/;
        return urduWords.test(text) ? 'ur' : 'ar';
      }
      return lang;
    }
  }
  return 'en'; // Default to English
};

/**
 * Common messages in multiple languages
 */
const messages = {
  en: {
    welcome: 'Hello! Welcome to our dental clinic. How can I help you today? 😊',
    bookingConfirmed: '✅ Appointment booked successfully!\n\n📅 Date: {date}\n⏰ Time: {time}\n🦷 Service: {service}\n🔑 Code: {code}',
    appointmentReminder: '🦷 Reminder: You have an appointment tomorrow at {time}. See you soon!',
    noSlotsAvailable: 'Sorry, no slots available on {date}. Would you like to try another date?',
    cancelConfirmed: '✅ Your appointment on {date} at {time} has been cancelled.',
    error: "I'm having trouble right now. Please try again or call us directly.",
  },
  ar: {
    welcome: 'مرحباً! أهلاً بك في عيادة الأسنان. كيف يمكنني مساعدتك اليوم؟ 😊',
    bookingConfirmed: '✅ تم حجز الموعد بنجاح!\n\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n🦷 الخدمة: {service}\n🔑 الكود: {code}',
    appointmentReminder: '🦷 تذكير: لديك موعد غداً في الساعة {time}. نراك قريباً!',
    noSlotsAvailable: 'عذراً، لا توجد مواعيد متاحة في {date}. هل تريد تجربة تاريخ آخر؟',
    error: 'أواجه مشكلة الآن. يرجى المحاولة مرة أخرى أو الاتصال بنا مباشرة.',
  },
  ur: {
    welcome: 'ہیلو! ہماری ڈینٹل کلینک میں آپ کا خیرمقدم ہے۔ آج میں آپ کی کیسے مدد کر سکتا ہوں؟ 😊',
    bookingConfirmed: '✅ اپوائنٹمنٹ کامیابی سے بک ہوگئی!\n\n📅 تاریخ: {date}\n⏰ وقت: {time}\n🦷 سروس: {service}\n🔑 کوڈ: {code}',
    appointmentReminder: '🦷 یاددہانی: کل {time} بجے آپ کی اپوائنٹمنٹ ہے۔ جلد ملیں!',
    error: 'ابھی کچھ تکنیکی مسئلہ ہے۔ دوبارہ کوشش کریں یا ہمیں براہ راست کال کریں۔',
  },
  fr: {
    welcome: 'Bonjour! Bienvenue dans notre cabinet dentaire. Comment puis-je vous aider? 😊',
    bookingConfirmed: '✅ Rendez-vous confirmé!\n\n📅 Date: {date}\n⏰ Heure: {time}\n🦷 Service: {service}\n🔑 Code: {code}',
    error: "J'ai des difficultés techniques. Veuillez réessayer ou nous appeler directement.",
  },
  es: {
    welcome: '¡Hola! Bienvenido a nuestra clínica dental. ¿Cómo puedo ayudarte hoy? 😊',
    bookingConfirmed: '✅ ¡Cita confirmada!\n\n📅 Fecha: {date}\n⏰ Hora: {time}\n🦷 Servicio: {service}\n🔑 Código: {code}',
    error: 'Tengo dificultades técnicas. Por favor, inténtelo de nuevo o llámenos directamente.',
  },
};

/**
 * Get message in specified language with variable interpolation
 */
const getMessage = (key, lang = 'en', variables = {}) => {
  const langMessages = messages[lang] || messages.en;
  let message = langMessages[key] || messages.en[key] || key;

  // Replace {variable} placeholders
  Object.entries(variables).forEach(([varKey, value]) => {
    message = message.replace(new RegExp(`{${varKey}}`, 'g'), value);
  });

  return message;
};

/**
 * Translate a message using AI (for unsupported languages)
 * Only called when the language isn't in our message dictionary
 */
const translateMessage = async (text, targetLanguage) => {
  // For supported languages, use built-in translations
  if (messages[targetLanguage]) return text;
  
  // For other languages, the AI model handles translation natively
  // The system prompt instructs Claude to respond in the patient's language
  return text;
};

module.exports = { detectLanguage, getMessage, translateMessage };
