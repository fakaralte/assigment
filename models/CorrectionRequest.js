const mongoose = require('mongoose');

const correctionRequestSchema = new mongoose.Schema({
  attendanceRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceRecord', required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
  oldStatus: { type: String, enum: ['present', 'absent', 'late'], required: true },
  newStatus: { type: String, enum: ['present', 'absent', 'late'], required: true },
  reason: { type: String, required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' }, // HOD/admin who approves
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('CorrectionRequest', correctionRequestSchema);