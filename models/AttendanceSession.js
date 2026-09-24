const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema({
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  date: { type: Date, required: true },
  period: { type: Number, required: true }, // e.g. 1-8
}, { timestamps: true });

// Prevent duplicate sessions for the same section/subject/date/period
attendanceSessionSchema.index({ subject: 1, section: 1, date: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);