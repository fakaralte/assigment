require('dotenv').config();
const mongoose = require('mongoose');
const Staff = require('./models/Staff');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  const existing = await Staff.findOne({ email: 'admin@college.com' });
  if (existing) { console.log('Admin already exists.'); return process.exit(0); }

  await Staff.create({
    name: 'Admin User',
    employeeId: 'EMP001',
    department: 'Administration',
    email: 'admin@college.com',
    password: 'admin123',
    role: 'admin', // admin sees both modules
  });
  console.log('Admin created: admin@college.com / admin123');
  process.exit(0);
}
seed().catch(err => { console.error(err); process.exit(1); });