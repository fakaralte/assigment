const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  installment: { type: mongoose.Schema.Types.ObjectId, ref: 'Installment', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['payment', 'reversal'], required: true },
  method: { type: String, enum: ['cash', 'upi', 'card', 'netbanking'], required: true },
  status: { type: String, enum: ['success', 'failed', 'pending'], default: 'success' },
  referenceId: { type: String, required: true, unique: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  reason: { type: String }, // required for reversals
}, { timestamps: true });

// Never update or delete rows here — always insert new ones (append-only ledger)
module.exports = mongoose.model('Transaction', transactionSchema);