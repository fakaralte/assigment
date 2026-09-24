const mongoose = require('mongoose');

const feeHeadSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Tuition, Hostel, Library
  department: { type: String, required: true },
  amount: { type: Number, required: true },
  semester: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('FeeHead', feeHeadSchema);