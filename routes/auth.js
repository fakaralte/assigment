const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Staff = require('../models/Staff');

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login');
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const staff = await Staff.findOne({ email });
  if (!staff || !(await bcrypt.compare(password, staff.password))) {
    req.flash('error', 'Invalid email or password');
    return res.redirect('/login');
  }
  req.session.user = { id: staff._id, name: staff.name, role: staff.role };
  res.redirect('/');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// Central landing — routes each role to a sensible home
router.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const { role } = req.session.user;
  if (role === 'faculty' || role === 'hod') return res.redirect('/faculty');
  if (role === 'accounts') return res.redirect('/fees/dashboard');
  return res.redirect('/admin/low-attendance'); // admin sees attendance admin by default
});

module.exports = router;