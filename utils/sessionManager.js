const UserSession = require('../models/UserSession');
const logger = require('./logger');
/**
 * Get or create a user session
 * @param {number} userId - User ID
 * @returns {Promise<Object>} - User session object
 */
async function getSession(userId) {
  try {
    let session = await UserSession.findOne({ user_id: userId });
    
    if (!session) {
      session = new UserSession({
        user_id: userId,
        step: null,
        data: {},
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
      await session.save();
    }
    
    // Check if session expired
    if (session.expires_at < new Date()) {
      session.step = null;
      session.data = {};
      session.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await session.save();
    }
    
    return session;
  } catch (error) {
    logger.error('Error getting session:', error);
    throw error;
  }
}
/**
 * Initialize a new session for case creation
 * @param {number} userId - User ID
 * @returns {Promise<void>}
 */
async function initializeCaseSession(userId) {
  try {
    await UserSession.findOneAndUpdate(
      { user_id: userId },
      {
        step: 'file_number',
        data: {},
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      },
      { upsert: true }
    );
  } catch (error) {
    logger.error('Error initializing case session:', error);
    throw error;
  }
}
/**
 * Update user session
 * @param {number} userId - User ID
 * @param {string} step - Current step
 * @param {Object} data - Session data
 * @returns {Promise<void>}
 */
async function updateSession(userId, step, data = {}) {
  try {
    // Only validate file_number when we're at the file_number step AND data contains file_number
    if (step === 'file_number' && data.hasOwnProperty('file_number') && !data.file_number) {
      throw new Error('File number is required');
    }
    
    await UserSession.findOneAndUpdate(
      { user_id: userId },
      {
        step,
        data,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      },
      { upsert: true }
    );
  } catch (error) {
    logger.error('Error updating session:', error);
    throw error;
  }
}
/**
 * Clear user session
 * @param {number} userId - User ID
 * @returns {Promise<void>}
 */
async function clearSession(userId) {
  try {
    await UserSession.findOneAndUpdate(
      { user_id: userId },
      {
        step: null,
        data: {},
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    );
  } catch (error) {
    logger.error('Error clearing session:', error);
    throw error;
  }
}
module.exports = {
  getSession,
  initializeCaseSession,
  updateSession,
  clearSession
};