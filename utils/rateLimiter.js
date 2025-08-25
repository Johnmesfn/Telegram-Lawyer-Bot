const logger = require('./logger');
// Simple in-memory rate limiter
const requestCounts = {};
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute
/**
 * Check if user is rate limited
 * @param {number} userId - User ID to check
 * @returns {boolean} - True if user is rate limited
 */
function isRateLimited(userId) {
  const now = Date.now();
  
  // Clean up old entries
  Object.keys(requestCounts).forEach(key => {
    if (now - requestCounts[key].timestamp > RATE_LIMIT_WINDOW) {
      delete requestCounts[key];
    }
  });
  
  // Check if user exists in rate limiter
  if (!requestCounts[userId]) {
    requestCounts[userId] = {
      count: 1,
      timestamp: now
    };
    return false;
  }
  
  // Check if user exceeded rate limit
  if (requestCounts[userId].count >= MAX_REQUESTS_PER_WINDOW) {
    logger.warn(`User ${userId} exceeded rate limit`);
    return true;
  }
  
  // Increment count
  requestCounts[userId].count++;
  return false;
}
module.exports = isRateLimited;