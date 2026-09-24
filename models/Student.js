const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNo: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  batch: { type: String, required: true }, // e.g. "2023-2027"
  email: { type: String, required: true, unique: true },
  phone: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);