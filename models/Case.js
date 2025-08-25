const mongoose = require('mongoose');
const caseSchema = new mongoose.Schema({
  user_id: { type: Number, required: true },
  file_number: { 
    type: String, 
    required: [true, 'File number is required'],
    trim: true
  },
  accuser: { type: String, required: [true, 'Accuser is required'], trim: true },
  defendant: { type: String, required: [true, 'Defendant is required'], trim: true },
  payment_date: { type: String, required: [true, 'Payment date is required'] },
  deadline: { type: String, required: [true, 'Deadline is required'] },
  status: { type: String, enum: ['active', 'expired', 'completed'], default: 'active' },
  reminders: {
    notified_30: { type: Boolean, default: false },
    notified_7: { type: Boolean, default: false },
    notified_1: { type: Boolean, default: false }
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});
// Create a compound unique index on user_id and file_number
caseSchema.index({ user_id: 1, file_number: 1 }, { 
  unique: true,
  name: 'user_file_number_unique'
});
// Update the updated_at field on save
caseSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});
module.exports = mongoose.model('Case', caseSchema);