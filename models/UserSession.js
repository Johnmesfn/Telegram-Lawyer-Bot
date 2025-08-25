const mongoose = require('mongoose');
const sessionSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true },
  step: { type: String },
  data: { type: Object, default: {} },
  expires_at: { type: Date },
  created_at: { type: Date, default: Date.now }
});
module.exports = mongoose.model('UserSession', sessionSchema);