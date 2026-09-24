const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  feeHead: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeHead', required: true },
  type: { type: String, enum: ['percentage', 'flat'], required: true },
  value: { type: Number, required: true },
  reason: { type: String, required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Discount', discountSchema);