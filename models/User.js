const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true },
  username: { type: String },
  timezone: { type: String, default: 'UTC' },
  language_code: { type: String },
  active: { type: Boolean, default: true },
  notifications_enabled: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  last_active: { type: Date, default: Date.now }
});
// Update last_active on save
userSchema.pre('save', function(next) {
  this.last_active = new Date();
  next();
});
module.exports = mongoose.model('User', userSchema);