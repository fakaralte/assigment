const mongoose = require('mongoose');

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const timetableEntrySchema = new mongoose.Schema({
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  day: { type: String, enum: DAYS, required: true },
  period: { type: Number, required: true, min: 1, max: 8 },
}, { timestamps: true });

// Hard constraints enforced at the DB level — a slot can only be used once per axis
timetableEntrySchema.index({ section: 1, day: 1, period: 1 }, { unique: true });   // section can't be in two places
timetableEntrySchema.index({ faculty: 1, day: 1, period: 1 }, { unique: true });   // faculty can't teach two classes
timetableEntrySchema.index({ classroom: 1, day: 1, period: 1 }, { unique: true }); // room can't host two classes

module.exports = mongoose.model('TimetableEntry', timetableEntrySchema);
module.exports.DAYS = DAYS;