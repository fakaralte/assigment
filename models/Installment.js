const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema({
  feeAssignment: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentFeeAssignment', required: true },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Installment', installmentSchema);