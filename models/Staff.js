const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  employeeId: { type: String, required: true, unique: true },
  department: { type: String },
  subjectsTaught: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['faculty', 'hod', 'admin', 'accounts'], default: 'faculty' },
}, { timestamps: true });

staffSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model('Staff', staffSchema);