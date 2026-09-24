const mongoose = require('mongoose');

const studentFeeAssignmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  feeHead: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeHead', required: true },
  totalAmount: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  dueDate: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('StudentFeeAssignment', studentFeeAssignmentSchema);