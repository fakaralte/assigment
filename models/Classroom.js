const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g. "Room 101", "CS Lab 2"
  type: { type: String, enum: ['lecture', 'lab'], default: 'lecture' },
  capacity: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Classroom', classroomSchema);