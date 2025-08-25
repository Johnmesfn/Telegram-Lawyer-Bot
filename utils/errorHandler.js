const logger = require('./logger');
// Global bot instance to avoid circular dependency
let botInstance = null;
/**
 * Set the bot instance for error handling
 * @param {Object} bot - The Telegram bot instance
 */
function setBotInstance(bot) {
  botInstance = bot;
}
/**
 * Global error handler for async operations
 * @param {Error} error - The error object
 * @param {string} context - Context where the error occurred
 * @param {number} userId - User ID for notification
 */
function handleAsyncError(error, context, userId = null) {
  logger.error(`Error in ${context}:`, error);
  
  if (userId && botInstance) {
    try {
      botInstance.sendMessage(userId, `❌ An error occurred while processing your request. Please try again later.`);
    } catch (err) {
      logger.error('Failed to notify user about error:', err);
    }
  }
}
/**
 * Wrapper for async functions to catch errors
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Wrapped function
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
module.exports = {
  handleAsyncError,
  asyncHandler,
  setBotInstance
};