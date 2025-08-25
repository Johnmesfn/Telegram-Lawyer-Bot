// 🌍 Tiny Express Web Server (for Render Free Plan)
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('✅ Telegram Lawyer Bot is running on Render Free Plan');
});

app.listen(PORT, () => {
  console.log(`🌍 Web server listening on port ${PORT}`);
});

// -----------------------------------------
// 🤖 Telegram Bot Code
// -----------------------------------------
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const { DateTime } = require('luxon');
const User = require('./models/User');
const Case = require('./models/Case');
const { 
  validateAndParseDate, 
  isDateInFuture, 
  calculateDeadline, 
  getDaysUntilDeadline,
  isDeadlineExpired,
  formatDateForDisplay
} = require('./utils/dateUtils');
const { handleAsyncError, setBotInstance } = require('./utils/errorHandler');
const logger = require('./utils/logger');
const isRateLimited = require('./utils/rateLimiter');
const { getSession, initializeCaseSession, updateSession, clearSession } = require('./utils/sessionManager');
const { removeExpiredCasesForUser } = require('./utils/caseCleanup');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Set the bot instance for error handling
setBotInstance(bot);

// Set the bot instance for cleanup
const { setBotInstance: setCleanupBotInstance } = require('./utils/caseCleanup');
setCleanupBotInstance(bot);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => logger.info('Connected to MongoDB'))
  .catch(err => logger.error('MongoDB connection error:', err));

// Custom keyboard layout similar to the screenshot
const customKeyboard = {
  reply_markup: {
    keyboard: [
      [
        { text: '➕ Add Case' },
        { text: '📋 My Cases' }
      ],
      [
        { text: '⚙️ Settings' },
        { text: 'ℹ️ Help' }
      ]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Inline keyboard for main menu (when showing menu options)
const mainMenuKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '❤️ Add Case', callback_data: 'add_case' },
        { text: '✏️ My Cases', callback_data: 'list_cases' }
      ],
      [
        { text: '👍 Settings', callback_data: 'settings' },
        { text: '💤 Help', callback_data: 'help' }
      ]
    ]
  }
};

// Expanded timezone options
const timezoneOptions = [
  [{ text: '🌍 Auto-Detect', callback_data: 'tz_auto' }],
  [{ text: 'Asia/Singapore', callback_data: 'tz_Asia/Singapore' }],
  [{ text: 'Asia/Tokyo', callback_data: 'tz_Asia/Tokyo' }],
  [{ text: 'Asia/Dubai', callback_data: 'tz_Asia/Dubai' }],
  [{ text: 'Europe/London', callback_data: 'tz_Europe/London' }],
  [{ text: 'Europe/Paris', callback_data: 'tz_Europe/Paris' }],
  [{ text: 'Europe/Berlin', callback_data: 'tz_Europe/Berlin' }],
  [{ text: 'America/New_York', callback_data: 'tz_America/New_York' }],
  [{ text: 'America/Los_Angeles', callback_data: 'tz_America/Los_Angeles' }],
  [{ text: 'America/Chicago', callback_data: 'tz_America/Chicago' }],
  [{ text: 'Australia/Sydney', callback_data: 'tz_Australia/Sydney' }],
  [{ text: 'Pacific/Auckland', callback_data: 'tz_Pacific/Auckland' }],
  [{ text: 'Africa/Addis_Ababa', callback_data: 'tz_Africa/Addis_Ababa' }],
  [{ text: '⬅️ Back', callback_data: 'settings' }]
];

// Track active sessions to prevent double-clicks
const activeSessions = new Set();

// List of custom keyboard buttons to distinguish from user input
const customKeyboardButtons = ['➕ Add Case', '📋 My Cases', '⚙️ Settings', 'ℹ️ Help'];

// Language to timezone mapping
const languageToTimezone = {
  'en': 'UTC', // Default for English
  'am': 'Africa/Addis_Ababa', // Amharic (Ethiopia)
  'ti': 'Africa/Asmara', // Tigrinya (Eritrea)
  'so': 'Africa/Mogadishu', // Somali
  'ar': 'Africa/Cairo', // Arabic
  'ru': 'Europe/Moscow', // Russian
  'zh': 'Asia/Shanghai', // Chinese
  'ja': 'Asia/Tokyo', // Japanese
  'ko': 'Asia/Seoul', // Korean
  'fr': 'Europe/Paris', // French
  'de': 'Europe/Berlin', // German
  'es': 'Europe/Madrid', // Spanish
  'it': 'Europe/Rome', // Italian
  'pt': 'Europe/Lisbon', // Portuguese
  'hi': 'Asia/Kolkata', // Hindi
  'bn': 'Asia/Dhaka', // Bengali
  'ur': 'Asia/Karachi', // Urdu
  'fa': 'Asia/Tehran', // Persian
  'tr': 'Europe/Istanbul', // Turkish
  'th': 'Asia/Bangkok', // Thai
  'vi': 'Asia/Ho_Chi_Minh', // Vietnamese
  'id': 'Asia/Jakarta', // Indonesian
  'ms': 'Asia/Kuala_Lumpur', // Malay
  'tl': 'Asia/Manila', // Filipino
  'my': 'Asia/Yangon', // Burmese
  'km': 'Asia/Phnom_Penh', // Khmer
  'lo': 'Asia/Vientiane', // Lao
  'ne': 'Asia/Kathmandu', // Nepali
  'si': 'Asia/Colombo', // Sinhala
  'pa': 'Asia/Kolkata', // Punjabi
  'gu': 'Asia/Kolkata', // Gujarati
  'ta': 'Asia/Kolkata', // Tamil
  'te': 'Asia/Kolkata', // Telugu
  'kn': 'Asia/Kolkata', // Kannada
  'ml': 'Asia/Kolkata', // Malayalam
  'or': 'Asia/Kolkata', // Odia
  'as': 'Asia/Kolkata', // Assamese
  'mr': 'Asia/Kolkata', // Marathi
  'sa': 'Asia/Kolkata', // Sanskrit
  'bo': 'Asia/Urumqi', // Tibetan
  'dz': 'Asia/Thimphu', // Dzongkha
  'ka': 'Asia/Tbilisi', // Georgian
  'hy': 'Asia/Yerevan', // Armenian
  'az': 'Asia/Baku', // Azerbaijani
  'kk': 'Asia/Almaty', // Kazakh
  'ky': 'Asia/Bishkek', // Kyrgyz
  'tg': 'Asia/Dushanbe', // Tajik
  'tk': 'Asia/Ashgabat', // Turkmen
  'uz': 'Asia/Tashkent', // Uzbek
  'mn': 'Asia/Ulaanbaatar', // Mongolian
  'ps': 'Asia/Kabul', // Pashto
  'sd': 'Asia/Karachi', // Sindhi
  'ku': 'Asia/Baghdad', // Kurdish
  'ckb': 'Asia/Baghdad', // Sorani Kurdish
  'ug': 'Asia/Urumqi', // Uyghur
  'yi': 'Europe/Berlin', // Yiddish
  'he': 'Asia/Jerusalem', // Hebrew
  'jv': 'Asia/Jakarta', // Javanese
  'su': 'Asia/Jakarta', // Sundanese
  'mg': 'Indian/Antananarivo', // Malagasy
  'sn': 'Africa/Harare', // Shona
  'yo': 'Africa/Lagos', // Yoruba
  'ig': 'Africa/Lagos', // Igbo
  'ha': 'Africa/Lagos', // Hausa
  'sw': 'Africa/Nairobi', // Swahili
  'zu': 'Africa/Johannesburg', // Zulu
  'af': 'Africa/Johannesburg', // Afrikaans
  'xh': 'Africa/Johannesburg', // Xhosa
  'st': 'Africa/Maseru', // Sesotho
  'tn': 'Africa/Gaborone', // Setswana
  'ss': 'Africa/Mbabane', // Swati
  'ts': 'Africa/Johannesburg', // Tsonga
  've': 'Africa/Johannesburg', // Venda
  'nr': 'Africa/Johannesburg', // Southern Ndebele
  'nso': 'Africa/Johannesburg', // Northern Sotho
};

// Function to detect timezone from user info
function detectTimezoneFromUser(user) {
  // Try to get timezone from language code
  if (user.language_code && languageToTimezone[user.language_code]) {
    return languageToTimezone[user.language_code];
  }
  
  // Fallback to UTC if no language code or no mapping found
  return 'UTC';
}

// Cancel command
bot.onText(/\/cancel/, async (msg) => {
  try {
    const userId = msg.chat.id;
    
    if (activeSessions.has(userId)) {
      await clearSession(userId);
      activeSessions.delete(userId);
      bot.sendMessage(userId, `✅ Current action cancelled.`, customKeyboard);
    } else {
      bot.sendMessage(userId, `No active action to cancel.`, customKeyboard);
    }
  } catch (error) {
    handleAsyncError(error, '/cancel command', msg.chat.id);
  }
});

// Start command
bot.onText(/\/start/, async (msg) => {
  try {
    const userId = msg.chat.id;
    
    // Check rate limit
    if (isRateLimited(userId)) {
      bot.sendMessage(userId, `⚠️ Too many requests. Please try again later.`);
      return;
    }
    
    // Find or create user with timezone detection
    let user = await User.findOne({ user_id: userId });
    let timezoneSet = false;
    let isNewUser = false;
    
    if (!user) {
      // Detect timezone from user info
      const detectedTimezone = detectTimezoneFromUser(msg.from);
      
      user = new User({
        user_id: userId,
        username: msg.from.username,
        timezone: detectedTimezone,
        language_code: msg.from.language_code,
        active: true,
        notifications_enabled: true
      });
      await user.save();
      
      timezoneSet = true;
      isNewUser = true;
    } else {
      // Update user activity and language code
      user.active = true;
      user.last_active = new Date();
      if (msg.from.language_code && !user.language_code) {
        user.language_code = msg.from.language_code;
      }
      
      // Try to update timezone if it wasn't set before
      if (!user.timezone || user.timezone === 'UTC') {
        const detectedTimezone = detectTimezoneFromUser(msg.from);
        if (detectedTimezone !== 'UTC') {
          user.timezone = detectedTimezone;
          timezoneSet = true;
        }
      }
      
      await user.save();
    }
    
    // Clear any existing session
    await clearSession(userId);
    activeSessions.delete(userId);
    
    // Remove expired cases for this user
    try {
      const removedCount = await removeExpiredCasesForUser(userId);
      if (removedCount > 0) {
        bot.sendMessage(userId, `🧹 I've marked ${removedCount} case(s) as expired.`);
      }
    } catch (error) {
      logger.error(`Error removing expired cases for user ${userId}:`, error);
    }
    
    // Send welcome message with timezone info
    let welcomeMessage = isNewUser 
      ? `Welcome! I'm your legal case assistant.`
      : `Welcome back!`;
    
    if (timezoneSet) {
      welcomeMessage += `\n\n🌍 I've automatically set your timezone to: *${user.timezone}*`;
      welcomeMessage += `\n\nIf this is incorrect, you can change it in Settings.`;
    } else if (!user.timezone || user.timezone === 'UTC') {
      welcomeMessage += `\n\n⚠️ I couldn't automatically detect your timezone.`;
      welcomeMessage += `\nPlease set your timezone in Settings for accurate reminders.`;
    }
    
    welcomeMessage += `\n\nPlease choose an option:`;
    
    bot.sendMessage(userId, welcomeMessage, {
      parse_mode: 'Markdown',
      ...customKeyboard
    });
  } catch (error) {
    handleAsyncError(error, '/start command', msg.chat.id);
  }
});

// Help command
bot.onText(/\/help/, async (msg) => {
  try {
    const userId = msg.chat.id;
    
    // Check rate limit
    if (isRateLimited(userId)) {
      bot.sendMessage(userId, `⚠️ Too many requests. Please try again later.`);
      return;
    }
    
    bot.sendMessage(userId,
      `Here's what I can do for you:\n\n` +
      `➕ Add a new case\n` +
      `📋 List all your cases\n` +
      `✏️ Edit or remove cases\n` +
      `⏰ Get notified before deadlines\n` +
      `⚙️ Set your timezone\n\n` +
      `💡 Expired cases are automatically marked as inactive daily.\n\n` +
      `Use /cancel to cancel any ongoing action.`,
      customKeyboard
    );
  } catch (error) {
    handleAsyncError(error, '/help command', msg.chat.id);
  }
});

// Handle message inputs for custom keyboard
bot.on('message', async (msg) => {
  try {
    const text = msg.text;
    const userId = msg.chat.id;
    
    // Skip if message is a command
    if (text.startsWith('/')) return;
    
    // Check rate limit
    if (isRateLimited(userId)) {
      bot.sendMessage(userId, `⚠️ Too many requests. Please try again later.`);
      return;
    }
    
    // Get user session
    const session = await getSession(userId);
    
    // If user is in an active session, check if they're trying to use a custom keyboard button
    if (activeSessions.has(userId)) {
      if (customKeyboardButtons.includes(text)) {
        bot.sendMessage(userId, `⚠️ Please complete the current action first or send /cancel to start over.`);
        return;
      }
      
      // Process session steps only if not a custom keyboard button
      if (session.step) {
        if (session.step === 'file_number') {
          // Validate that we have a file number
          if (!text || text.trim() === '') {
            bot.sendMessage(userId, `File number cannot be empty. Please send a valid file number:`, {
              parse_mode: 'Markdown',
              reply_markup: { force_reply: true }
            });
            return;
          }
          
          session.data.file_number = text;
          await updateSession(userId, 'accuser', session.data);
          bot.sendMessage(userId, `Got it. Now send the *Accuser* name:`, {
            parse_mode: 'Markdown',
            reply_markup: { force_reply: true }
          });
        }
        
        else if (session.step === 'accuser') {
          // Validate that we have an accuser
          if (!text || text.trim() === '') {
            bot.sendMessage(userId, `Accuser name cannot be empty. Please send a valid accuser name:`, {
              parse_mode: 'Markdown',
              reply_markup: { force_reply: true }
            });
            return;
          }
          
          session.data.accuser = text;
          await updateSession(userId, 'defendant', session.data);
          bot.sendMessage(userId, `Now send the *Defendant* name:`, {
            parse_mode: 'Markdown',
            reply_markup: { force_reply: true }
          });
        }
        
        else if (session.step === 'defendant') {
          // Validate that we have a defendant
          if (!text || text.trim() === '') {
            bot.sendMessage(userId, `Defendant name cannot be empty. Please send a valid defendant name:`, {
              parse_mode: 'Markdown',
              reply_markup: { force_reply: true }
            });
            return;
          }
          
          session.data.defendant = text;
          await updateSession(userId, 'payment_date', session.data);
          bot.sendMessage(userId, `Finally, send the *Payment Date* (YYYY-MM-DD):`, {
            parse_mode: 'Markdown',
            reply_markup: { force_reply: true }
          });
        }
        
        else if (session.step === 'payment_date') {
          try {
            const paymentDate = validateAndParseDate(text);
            
            if (!paymentDate) {
              throw new Error('Invalid date format. Please use YYYY-MM-DD format.');
            }
            
            if (isDateInFuture(paymentDate)) {
              throw new Error('Payment date cannot be in the future');
            }
            
            const deadline = calculateDeadline(paymentDate);
            
            // Get user's timezone
            const user = await User.findOne({ user_id: userId });
            const timezone = user ? user.timezone : 'UTC';
            
            // Check if the deadline has already passed
            if (isDeadlineExpired(deadline, timezone)) {
              throw new Error('This case has already expired. The deadline was in the past. Cases that have expired cannot be saved.');
            }
            
            // Check if a case with this file number already exists for this user
            const existingCase = await Case.findOne({ 
              user_id: userId, 
              file_number: session.data.file_number 
            });
            
            if (existingCase) {
              throw new Error(`A case with file number "${session.data.file_number}" already exists.`);
            }
            
            // Validate that we have all required data
            if (!session.data.file_number || !session.data.accuser || !session.data.defendant) {
              throw new Error('Missing required case information. Please start over.');
            }
            
            await Case.create({
              user_id: userId,
              file_number: session.data.file_number,
              accuser: session.data.accuser,
              defendant: session.data.defendant,
              payment_date: text,
              deadline: deadline,
              status: 'active',
              reminders: {
                notified_30: false,
                notified_7: false,
                notified_1: false
              }
            });
            
            bot.sendMessage(userId,
              `✅ *Case Added Successfully*\n\n` +
              `*File Number:* ${session.data.file_number}\n` +
              `*Accuser:* ${session.data.accuser}\n` +
              `*Defendant:* ${session.data.defendant}\n` +
              `*Payment Date:* ${formatDateForDisplay(text, timezone)}\n` +
              `*Deadline:* ${formatDateForDisplay(deadline, timezone)}`,
              { 
                parse_mode: 'Markdown',
                ...customKeyboard
              }
            );
            
            // Clear session
            await clearSession(userId);
            activeSessions.delete(userId);
          } catch (err) {
            // Handle MongoDB duplicate key error specifically
            if (err.name === 'MongoServerError' && err.code === 11000) {
              bot.sendMessage(userId, `❌ A case with this file number already exists. Please use a different file number.`, customKeyboard);
            } else {
              bot.sendMessage(userId, `❌ ${err.message}. Please try again.`, customKeyboard);
            }
            await clearSession(userId);
            activeSessions.delete(userId);
          }
        }
        
        // Handle edit_payment_date step in regular message handler
        else if (session.step === 'edit_payment_date') {
          try {
            const paymentDate = validateAndParseDate(text);
            
            if (!paymentDate) {
              throw new Error('Invalid date format. Please use YYYY-MM-DD format.');
            }
            
            if (isDateInFuture(paymentDate)) {
              throw new Error('Payment date cannot be in the future');
            }
            
            const deadline = calculateDeadline(paymentDate);
            const caseId = session.data.caseId;
            
            // Get user's timezone
            const user = await User.findOne({ user_id: userId });
            const timezone = user ? user.timezone : 'UTC';
            
            // Check if the deadline has already passed
            if (isDeadlineExpired(deadline, timezone)) {
              throw new Error('This case has already expired. The deadline was in the past. Cases that have expired cannot be saved.');
            }
            
            await Case.findByIdAndUpdate(caseId, {
              payment_date: text,
              deadline: deadline,
              status: 'active',
              reminders: {
                notified_30: false,
                notified_7: false,
                notified_1: false
              }
            });
            
            bot.sendMessage(userId, `✅ Case updated. New deadline: ${formatDateForDisplay(deadline, timezone)}`, {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '📋 My Cases', callback_data: 'list_cases' }],
                  [{ text: '⬅️ Main Menu', callback_data: 'back_to_menu' }]
                ]
              }
            });
            
            // Clear session
            await clearSession(userId);
            activeSessions.delete(userId);
          } catch (err) {
            bot.sendMessage(userId, `❌ ${err.message}. Please try again.`, {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '📋 My Cases', callback_data: 'list_cases' }],
                  [{ text: '⬅️ Main Menu', callback_data: 'back_to_menu' }]
                ]
              }
            });
            await clearSession(userId);
            activeSessions.delete(userId);
          }
        }
      }
    } else {
      // Only process custom keyboard buttons if not in an active session
      if (text === '➕ Add Case') {
        // Prevent double-clicks
        if (activeSessions.has(userId)) {
          bot.sendMessage(userId, `⚠️ You're already in the process of adding a case. Please complete it first.`);
          return;
        }
        
        try {
          // Clear any existing session
          await clearSession(userId);
          
          // Initialize session for case creation
          await initializeCaseSession(userId);
          activeSessions.add(userId);
          
          bot.sendMessage(userId, `Let's add a new case. Please send the *File Number*:`, {
            parse_mode: 'Markdown',
            reply_markup: { force_reply: true }
          });
        } catch (error) {
          handleAsyncError(error, 'add_case button', userId);
          activeSessions.delete(userId);
        }
      }
      
      else if (text === '📋 My Cases') {
        try {
          // Clear any existing session
          await clearSession(userId);
          activeSessions.delete(userId);
          
          // First, remove any expired cases for this user
          try {
            await removeExpiredCasesForUser(userId);
          } catch (error) {
            logger.error(`Error removing expired cases for user ${userId}:`, error);
          }
          
          const cases = await Case.find({ user_id: userId, status: 'active' });
          
          if (!cases.length) {
            bot.sendMessage(userId, `You don't have any active cases. Expired cases have been marked as inactive.`, {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '⬅️ Back to Menu', callback_data: 'back_to_menu' }]
                ]
              }
            });
            return;
          }
          
          // Get user's timezone
          const user = await User.findOne({ user_id: userId });
          const timezone = user ? user.timezone : 'UTC';
          
          // Format cases with expiration status
          const caseList = cases.map(c => {
            const daysLeft = getDaysUntilDeadline(c.deadline, timezone);
            const status = daysLeft <= 7 ? '⚠️ DUE SOON' : '✅ Active';
            return `${status} ${c.file_number} - ${c.accuser} vs ${c.defendant}`;
          });
          
          const keyboard = cases.map((c, index) => [
            { text: caseList[index], callback_data: `case_${c._id}` }
          ]);
          keyboard.push([{ text: '⬅️ Back to Menu', callback_data: 'back_to_menu' }]);
          
          bot.sendMessage(userId, `*Your Active Cases:*`, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
          });
        } catch (error) {
          handleAsyncError(error, 'list_cases button', userId);
        }
      }
      
      else if (text === '⚙️ Settings') {
        try {
          // Clear any existing session
          await clearSession(userId);
          activeSessions.delete(userId);
          
          // Get user settings
          const user = await User.findOne({ user_id: userId });
          const notificationStatus = user?.notifications_enabled ? '✅ Enabled' : '❌ Disabled';
          
          bot.sendMessage(userId, `Choose a setting:`, {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🌍 Change Timezone', callback_data: 'set_timezone' }],
                [{ text: `🔔 Notifications ${notificationStatus}`, callback_data: 'toggle_notifications' }],
                [{ text: '⬅️ Back to Menu', callback_data: 'back_to_menu' }]
              ]
            }
          });
        } catch (error) {
          handleAsyncError(error, 'settings button', userId);
        }
      }
      
      else if (text === 'ℹ️ Help') {
        try {
          // Clear any existing session
          await clearSession(userId);
          activeSessions.delete(userId);
          
          bot.sendMessage(userId,
            `Here's what I can do for you:\n\n` +
            `➕ Add a new case\n` +
            `📋 List all your cases\n` +
            `✏️ Edit or remove cases\n` +
            `⏰ Get notified before deadlines\n` +
            `⚙️ Set your timezone\n\n` +
            `💡 Expired cases are automatically marked as inactive daily.\n\n` +
            `Use /cancel to cancel any ongoing action.`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '⬅️ Back to Menu', callback_data: 'back_to_menu' }]
                ]
              }
            }
          );
        } catch (error) {
          handleAsyncError(error, 'help button', userId);
        }
      }
    }
    
    // Check if session is about to expire (within 1 hour)
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    if (session.expires_at < oneHourFromNow && session.step) {
      bot.sendMessage(userId, `⏱️ Your session will expire soon. Please complete your current action or send /cancel to start over.`);
    }
  } catch (error) {
    handleAsyncError(error, 'message handler', msg.chat.id);
  }
});

// Callback handler
bot.on('callback_query', async (query) => {
  try {
    const msg = query.message;
    const userId = query.from.id;
    const data = query.data;
    
    // Check rate limit
    if (isRateLimited(userId)) {
      bot.answerCallbackQuery(query.id, { text: '⚠️ Too many requests. Please try again later.' });
      return;
    }
    
    if (data === 'back_to_menu') {
      // Clear any existing session
      await clearSession(userId);
      activeSessions.delete(userId);
      
      bot.editMessageText(`Main Menu:`, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: 'Markdown',
        ...mainMenuKeyboard
      });
    }
    
    else if (data === 'add_case') {
      // Prevent double-clicks
      if (activeSessions.has(userId)) {
        bot.answerCallbackQuery(query.id, { text: '⚠️ You\'re already in the process of adding a case.' });
        return;
      }
      
      try {
        // Clear any existing session
        await clearSession(userId);
        
        // Initialize session for case creation
        await initializeCaseSession(userId);
        activeSessions.add(userId);
        
        bot.sendMessage(userId, `Let's add a new case. Please send the *File Number*:`, {
          parse_mode: 'Markdown',
          reply_markup: { force_reply: true }
        });
      } catch (error) {
        handleAsyncError(error, 'add_case callback', userId);
        bot.answerCallbackQuery(query.id, { text: '❌ An error occurred while preparing to add a case.' });
        activeSessions.delete(userId);
      }
    }
    
    else if (data === 'list_cases') {
      try {
        // Clear any existing session
        await clearSession(userId);
        activeSessions.delete(userId);
        
        // First, remove any expired cases for this user
        try {
          await removeExpiredCasesForUser(userId);
        } catch (error) {
          logger.error(`Error removing expired cases for user ${userId}:`, error);
        }
        
        const cases = await Case.find({ user_id: userId, status: 'active' });
        
        if (!cases.length) {
          bot.editMessageText(`You don't have any active cases. Expired cases have been marked as inactive.`, {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            reply_markup: {
              inline_keyboard: [
                [{ text: '⬅️ Back to Menu', callback_data: 'back_to_menu' }]
              ]
            }
          });
          return;
        }
        
        // Get user's timezone
        const user = await User.findOne({ user_id: userId });
        const timezone = user ? user.timezone : 'UTC';
        
        // Format cases with expiration status
        const caseList = cases.map(c => {
          const daysLeft = getDaysUntilDeadline(c.deadline, timezone);
          const status = daysLeft <= 7 ? '⚠️ DUE SOON' : '✅ Active';
          return `${status} ${c.file_number} - ${c.accuser} vs ${c.defendant}`;
        });
        
        const keyboard = cases.map((c, index) => [
          { text: caseList[index], callback_data: `case_${c._id}` }
        ]);
        keyboard.push([{ text: '⬅️ Back to Menu', callback_data: 'back_to_menu' }]);
        
        bot.editMessageText(`*Your Active Cases:*`, {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        });
      } catch (error) {
        handleAsyncError(error, 'list_cases callback', userId);
        bot.answerCallbackQuery(query.id, { text: '❌ An error occurred while fetching your cases.' });
      }
    }
    
    else if (data === 'settings') {
      try {
        // Clear any existing session
        await clearSession(userId);
        activeSessions.delete(userId);
        
        // Get user settings
        const user = await User.findOne({ user_id: userId });
        const notificationStatus = user?.notifications_enabled ? '✅ Enabled' : '❌ Disabled';
        
        bot.editMessageText(`Choose a setting:`, {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          reply_markup: {
            inline_keyboard: [
              [{ text: '🌍 Change Timezone', callback_data: 'set_timezone' }],
              [{ text: `🔔 Notifications ${notificationStatus}`, callback_data: 'toggle_notifications' }],
              [{ text: '⬅️ Back to Menu', callback_data: 'back_to_menu' }]
            ]
          }
        });
      } catch (error) {
        handleAsyncError(error, 'settings callback', userId);
        bot.answerCallbackQuery(query.id, { text: '❌ An error occurred while loading settings.' });
      }
    }
    
    else if (data === 'help') {
      try {
        // Clear any existing session
        await clearSession(userId);
        activeSessions.delete(userId);
        
        bot.editMessageText(
          `Here's what I can do for you:\n\n` +
          `➕ Add a new case\n` +
          `📋 List all your cases\n` +
          `✏️ Edit or remove cases\n` +
          `⏰ Get notified before deadlines\n` +
          `⚙️ Set your timezone\n\n` +
          `💡 Expired cases are automatically marked as inactive daily.\n\n` +
          `Use /cancel to cancel any ongoing action.`,
          {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '⬅️ Back to Menu', callback_data: 'back_to_menu' }]
              ]
            }
          }
        );
      } catch (error) {
        handleAsyncError(error, 'help callback', userId);
        bot.answerCallbackQuery(query.id, { text: '❌ An error occurred while loading help.' });
      }
    }
    
    else if (data === 'toggle_notifications') {
      try {
        const user = await User.findOne({ user_id: userId });
        if (user) {
          user.notifications_enabled = !user.notifications_enabled;
          await user.save();
          
          const status = user.notifications_enabled ? 'enabled' : 'disabled';
          bot.editMessageText(`✅ Notifications ${status}.`, {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            reply_markup: {
              inline_keyboard: [
                [{ text: '⬅️ Back to Settings', callback_data: 'settings' }]
              ]
            }
          });
        }
      } catch (error) {
        handleAsyncError(error, 'toggle notifications callback', userId);
        bot.answerCallbackQuery(query.id, { text: '❌ An error occurred while toggling notifications.' });
      }
    }
    
    else if (data.startsWith('case_')) {
      try {
        const caseId = data.split('_')[1];
        const c = await Case.findById(caseId);
        
        if (!c) {
          bot.answerCallbackQuery(query.id, { text: '❌ Case not found.' });
          return;
        }
        
        // Get user's timezone
        const user = await User.findOne({ user_id: userId });
        const timezone = user ? user.timezone : 'UTC';
        
        // Calculate days until deadline
        const daysLeft = getDaysUntilDeadline(c.deadline, timezone);
        
        // Check if case is expired (shouldn't happen if we're cleaning properly, but just in case)
        if (daysLeft < 0) {
          // Update case status to expired
          await Case.findByIdAndUpdate(caseId, { status: 'expired' });
          bot.answerCallbackQuery(query.id, { text: 'This case has expired and has been marked as inactive.' });
          return;
        }
        
        const statusText = daysLeft <= 7 ? '⚠️ *DUE SOON*' : '✅ *Active*';
        const daysLeftText = daysLeft === 0 ? 'Deadline is today!' : `${daysLeft} days remaining`;
        
        bot.editMessageText(
          `${statusText}\n\n` +
          `*File Number:* ${c.file_number}\n` +
          `*Accuser:* ${c.accuser}\n` +
          `*Defendant:* ${c.defendant}\n` +
          `*Payment Date:* ${formatDateForDisplay(c.payment_date, timezone)}\n` +
          `*Deadline:* ${formatDateForDisplay(c.deadline, timezone)}\n` +
          `*Status:* ${daysLeftText}`,
          {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '✏️ Edit', callback_data: `edit_${caseId}` }],
                [{ text: '🗑️ Remove', callback_data: `remove_${caseId}` }],
                [{ text: '⬅️ Back', callback_data: 'list_cases' }]
              ]
            }
          }
        );
      } catch (error) {
        handleAsyncError(error, 'case detail callback', userId);
        bot.answerCallbackQuery(query.id, { text: '❌ An error occurred while fetching case details.' });
      }
    }
    
    else if (data.startsWith('edit_')) {
      try {
        const caseId = data.split('_')[1];
        const c = await Case.findById(caseId);
        
        if (!c) {
          bot.answerCallbackQuery(query.id, { text: '❌ Case not found.' });
          return;
        }
        
        // Clear any existing session
        await clearSession(userId);
        
        await updateSession(userId, 'edit_payment_date', { caseId });
        activeSessions.add(userId);
        
        bot.editMessageText(`Send new *payment date* (YYYY-MM-DD):`, {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Cancel', callback_data: `case_${caseId}` }]
            ]
          }
        });
      } catch (error) {
        handleAsyncError(error, 'edit case callback', userId);
        bot.answerCallbackQuery(query.id, { text: '❌ An error occurred while preparing to edit the case.' });
      }
    }
    
    else if (data.startsWith('remove_')) {
      try {
        const caseId = data.split('_')[1];
        const c = await Case.findById(caseId);
        
        if (!c) {
          bot.answerCallbackQuery(query.id, { text: '❌ Case not found.' });
          return;
        }
        
        bot.editMessageText(`Are you *sure* you want to delete this case?`, {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Yes, delete', callback_data: `confirm_remove_${caseId}` }],
              [{ text: '❌ Cancel', callback_data: `case_${caseId}` }]
            ]
          }
        });
      } catch (error) {
        handleAsyncError(error, 'remove case callback', userId);
        bot.answerCallbackQuery(query.id, { text: '❌ An error occurred while preparing to remove the case.' });
      }
    }
    
    else if (data.startsWith('confirm_remove_')) {
      try {
        const caseId = data.split('_')[2];
        const result = await Case.findByIdAndDelete(caseId);
        
        if (!result) {
          bot.answerCallbackQuery(query.id, { text: '❌ Case not found.' });
          return;
        }
        
        bot.editMessageText(`✅ Case deleted.`, {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          reply_markup: {
            inline_keyboard: [
              [{ text: '📋 My Cases', callback_data: 'list_cases' }],
              [{ text: '⬅️ Main Menu', callback_data: 'back_to_menu' }]
            ]
          }
        });
      } catch (error) {
        handleAsyncError(error, 'confirm remove callback', userId);
        bot.answerCallbackQuery(query.id, { text: '❌ An error occurred while deleting the case.' });
      }
    }
    
    else if (data === 'set_timezone') {
      try {
        // Clear any existing session
        await clearSession(userId);
        activeSessions.delete(userId);
        
        bot.editMessageText(`Choose your timezone:`, {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          reply_markup: {
            inline_keyboard: timezoneOptions
          }
        });
      } catch (error) {
        handleAsyncError(error, 'set_timezone callback', userId);
        bot.answerCallbackQuery(query.id, { text: '❌ An error occurred while loading timezone options.' });
      }
    }
    
    else if (data === 'tz_auto') {
      try {
        // Auto-detect timezone from user info
        const user = await User.findOne({ user_id: userId });
        if (user) {
          const detectedTimezone = detectTimezoneFromUser(query.from);
          user.timezone = detectedTimezone;
          await user.save();
          
          bot.editMessageText(`✅ Timezone automatically set to: ${detectedTimezone}`, {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            reply_markup: {
              inline_keyboard: [
                [{ text: '⬅️ Back to Settings', callback_data: 'settings' }]
              ]
            }
          });
        }
      } catch (error) {
        handleAsyncError(error, 'auto timezone callback', userId);
        bot.answerCallbackQuery(query.id, { text: '❌ An error occurred while auto-detecting timezone.' });
      }
    }
    
    else if (data.startsWith('tz_')) {
      try {
        const timezone = data.replace('tz_', '');
        await User.findOneAndUpdate({ user_id: userId }, { timezone });
        
        bot.editMessageText(`✅ Timezone set to: ${timezone}`, {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Back to Settings', callback_data: 'settings' }]
            ]
          }
        });
      } catch (error) {
        handleAsyncError(error, 'timezone callback', userId);
        bot.answerCallbackQuery(query.id, { text: '❌ An error occurred while setting your timezone.' });
      }
    }
    
    // Acknowledge the callback query
    bot.answerCallbackQuery(query.id);
  } catch (error) {
    handleAsyncError(error, 'callback query handler', query.from.id);
    bot.answerCallbackQuery(query.id, { text: '❌ An unexpected error occurred.' });
  }
});

// Daily reminder check with timezone support
setInterval(async () => {
  try {
    logger.info('Running reminder check...');
    
    const cases = await Case.find();
    
    for (const c of cases) {
      try {
        const user = await User.findOne({ user_id: c.user_id });
        if (!user || !user.timezone || !user.notifications_enabled) continue;
        
        // Skip expired cases
        if (c.status === 'expired') continue;
        
        // Get days until deadline in user's timezone
        const daysLeft = getDaysUntilDeadline(c.deadline, user.timezone);
        
        // Check if case is expired and update status
        if (daysLeft < 0) {
          // Update case status to expired
          await Case.findByIdAndUpdate(c._id, { status: 'expired' });
          logger.info(`Marked case ${c.file_number} as expired for user ${c.user_id}`);
          
          // Notify user about expired case
          try {
            bot.sendMessage(c.user_id, 
              `🧹 The case "${c.file_number}" has expired and has been marked as inactive.`
            );
          } catch (error) {
            logger.error(`Failed to notify user ${c.user_id} about expired case:`, error);
          }
          
          continue;
        }
        
        // Send 30-day reminder
        if (daysLeft <= 30 && daysLeft > 7 && !c.reminders.notified_30) {
          try {
            bot.sendMessage(c.user_id, `⏰ Reminder: Case "${c.file_number}" (${c.accuser} vs ${c.defendant}) is due in ${daysLeft} days.`, {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '📋 My Cases', callback_data: 'list_cases' }],
                  [{ text: '⬅️ Main Menu', callback_data: 'back_to_menu' }]
                ]
              }
            });
            
            // Update only the 30day reminder flag
            await Case.findByIdAndUpdate(c._id, {
              'reminders.notified_30': true
            });
            
            logger.info(`Sent 30-day reminder for case ${c.file_number} to user ${c.user_id}`);
          } catch (error) {
            logger.error(`Failed to send 30-day reminder for case ${c.file_number} to user ${c.user_id}:`, error);
          }
        }
        
        // Send 7-day reminder
        if (daysLeft <= 7 && daysLeft > 1 && !c.reminders.notified_7) {
          try {
            bot.sendMessage(c.user_id, `🔔 Case "${c.file_number}" is due in ${daysLeft} days.`, {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '📋 My Cases', callback_data: 'list_cases' }],
                  [{ text: '⬅️ Main Menu', callback_data: 'back_to_menu' }]
                ]
              }
            });
            
            // Update only the 7day reminder flag
            await Case.findByIdAndUpdate(c._id, {
              'reminders.notified_7': true
            });
            
            logger.info(`Sent 7-day reminder for case ${c.file_number} to user ${c.user_id}`);
          } catch (error) {
            logger.error(`Failed to send 7-day reminder for case ${c.file_number} to user ${c.user_id}:`, error);
          }
        }
        
        // Send 1-day reminder
        if (daysLeft === 1 && !c.reminders.notified_1) {
          try {
            bot.sendMessage(c.user_id, `🚨 Case "${c.file_number}" is due TOMORROW!`, {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '📋 My Cases', callback_data: 'list_cases' }],
                  [{ text: '⬅️ Main Menu', callback_data: 'back_to_menu' }]
                ]
              }
            });
            
            // Update only the 1day reminder flag
            await Case.findByIdAndUpdate(c._id, {
              'reminders.notified_1': true
            });
            
            logger.info(`Sent 1-day reminder for case ${c.file_number} to user ${c.user_id}`);
          } catch (error) {
            logger.error(`Failed to send 1-day reminder for case ${c.file_number} to user ${c.user_id}:`, error);
          }
        }
      } catch (error) {
        logger.error(`Error processing case ${c._id} for reminders:`, error);
      }
    }
    
    logger.info('Reminder check completed');
  } catch (error) {
    logger.error('Error in reminder check:', error);
  }
}, 60 * 60 * 1000); // Check every hour instead of daily for more accuracy

// Daily expired case cleanup for all users
setInterval(async () => {
  try {
    logger.info('Running daily expired case cleanup for all users...');
    const { removeAllExpiredCases } = require('./utils/caseCleanup');
    await removeAllExpiredCases();
    logger.info('Daily expired case cleanup completed');
  } catch (error) {
    logger.error('Error in daily expired case cleanup:', error);
  }
}, 24 * 60 * 60 * 1000); // Run once a day

// Global error handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
logger.info('Bot started');