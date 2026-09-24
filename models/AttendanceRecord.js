const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSession', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  status: { type: String, enum: ['present', 'absent', 'late'], required: true },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
  markedAt: { type: Date, default: Date.now },
}, { timestamps: true });

attendanceRecordSchema.index({ session: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);