const { DateTime } = require('luxon');
/**
 * Validate and parse a date string in YYYY-MM-DD format
 * @param {string} dateString - Date string to validate
 * @returns {DateTime|null} - Parsed DateTime object or null if invalid
 */
function validateAndParseDate(dateString) {
  // Check if the format matches YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return null;
  }
  
  const date = DateTime.fromFormat(dateString, 'yyyy-MM-dd');
  
  // Check if the date is valid
  if (!date.isValid) {
    return null;
  }
  
  return date;
}
/**
 * Check if a date is in the future
 * @param {DateTime} date - Date to check
 * @returns {boolean} - True if the date is in the future
 */
function isDateInFuture(date) {
  const today = DateTime.now().startOf('day');
  return date > today;
}
/**
 * Calculate deadline (2 years from payment date)
 * @param {DateTime} paymentDate - Payment date
 * @returns {string} - Deadline in YYYY-MM-DD format
 */
function calculateDeadline(paymentDate) {
  return paymentDate.plus({ years: 2 }).toFormat('yyyy-MM-dd');
}
/**
 * Get days until deadline in user's timezone
 * @param {string} deadline - Deadline in YYYY-MM-DD format
 * @param {string} timezone - User's timezone
 * @returns {number} - Days until deadline
 */
function getDaysUntilDeadline(deadline, timezone) {
  const now = DateTime.now().setZone(timezone).startOf('day');
  const deadlineDate = DateTime.fromISO(deadline).setZone(timezone).startOf('day');
  
  return Math.ceil(deadlineDate.diff(now, 'days').days);
}
/**
 * Check if a deadline has already passed
 * @param {string} deadline - Deadline in YYYY-MM-DD format
 * @param {string} timezone - User's timezone
 * @returns {boolean} - True if the deadline has passed
 */
function isDeadlineExpired(deadline, timezone) {
  const now = DateTime.now().setZone(timezone).startOf('day');
  const deadlineDate = DateTime.fromISO(deadline).setZone(timezone).startOf('day');
  
  return deadlineDate < now;
}
/**
 * Format a date for display
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {string} timezone - User's timezone
 * @returns {string} - Formatted date string
 */
function formatDateForDisplay(dateStr, timezone) {
  return DateTime.fromISO(dateStr).setZone(timezone).toFormat('MMM dd, yyyy');
}
module.exports = {
  validateAndParseDate,
  isDateInFuture,
  calculateDeadline,
  getDaysUntilDeadline,
  isDeadlineExpired,
  formatDateForDisplay
};