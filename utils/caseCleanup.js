const Case = require('../models/Case');
const User = require('../models/User');
const { isDeadlineExpired } = require('./dateUtils');
const logger = require('./logger');

// Global bot instance to avoid circular dependency
let botInstance = null;

/**
 * Set the bot instance for cleanup notifications
 * @param {Object} bot - The Telegram bot instance
 */
function setBotInstance(bot) {
  botInstance = bot;
}

/**
 * Remove all expired cases for all users
 * @returns {Promise<Object>} - Result object with count of removed cases
 */
async function removeAllExpiredCases() {
  try {
    logger.info('Starting expired case cleanup...');
    
    const users = await User.find({ active: true, notifications_enabled: true });
    let totalMarked = 0;
    const results = {};
    
    for (const user of users) {
      const timezone = user.timezone || 'UTC';
      const activeCases = await Case.find({ user_id: user.user_id, status: 'active' });
      
      const casesToMark = [];
      for (const caseItem of activeCases) {
        if (isDeadlineExpired(caseItem.deadline, timezone)) {
          casesToMark.push(caseItem._id);
        }
      }
      
      if (casesToMark.length > 0) {
        const result = await Case.updateMany(
          { _id: { $in: casesToMark } },
          { status: 'expired' }
        );
        results[user.user_id] = result.modifiedCount;
        totalMarked += result.modifiedCount;
        
        logger.info(`Marked ${result.modifiedCount} cases as expired for user ${user.user_id}`);
        
        // Notify user about expired cases if bot instance is available
        if (botInstance) {
          try {
            botInstance.sendMessage(user.user_id, 
              `🧹 I've marked ${result.modifiedCount} case(s) as expired. ` +
              `These cases had already passed their deadline and are no longer active.`
            );
          } catch (error) {
            logger.error(`Failed to notify user ${user.user_id} about expired cases:`, error);
          }
        }
      }
    }
    
    logger.info(`Expired case cleanup completed. Total marked: ${totalMarked}`);
    return { totalMarked, results };
  } catch (error) {
    logger.error('Error during expired case cleanup:', error);
    throw error;
  }
}

/**
 * Remove expired cases for a specific user
 * @param {number} userId - User ID
 * @returns {Promise<number>} - Number of removed cases
 */
async function removeExpiredCasesForUser(userId) {
  try {
    const user = await User.findOne({ user_id: userId });
    if (!user || !user.notifications_enabled) {
      logger.warn(`User not found or notifications disabled: ${userId}`);
      return 0;
    }
    
    const timezone = user.timezone || 'UTC';
    const activeCases = await Case.find({ user_id: userId, status: 'active' });
    
    const casesToMark = [];
    for (const caseItem of activeCases) {
      if (isDeadlineExpired(caseItem.deadline, timezone)) {
        casesToMark.push(caseItem._id);
      }
    }
    
    if (casesToMark.length === 0) {
      return 0;
    }
    
    const result = await Case.updateMany(
      { _id: { $in: casesToMark } },
      { status: 'expired' }
    );
    logger.info(`Marked ${result.modifiedCount} cases as expired for user ${userId}`);
    
    // Notify user about expired cases if bot instance is available
    if (botInstance) {
      try {
        botInstance.sendMessage(userId, 
          `🧹 I've marked ${result.modifiedCount} case(s) as expired. ` +
          `These cases had already passed their deadline and are no longer active.`
        );
      } catch (error) {
        logger.error(`Failed to notify user ${userId} about expired cases:`, error);
      }
    }
    
    return result.modifiedCount;
  } catch (error) {
    logger.error(`Error removing expired cases for user ${userId}:`, error);
    throw error;
  }
}

module.exports = {
  removeAllExpiredCases,
  removeExpiredCasesForUser,
  setBotInstance
};