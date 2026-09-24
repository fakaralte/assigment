const express = require('express');
const router = express.Router();
const { requireLogin, requireRole } = require('../middleware/auth');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');

router.use(requireLogin, requireRole('faculty', 'hod'));

// Step 1: pick section/subject/date/period
router.get('/', async (req, res) => {
  const sections = await Section.find();
  const subjects = await Subject.find();
  res.render('faculty/select-class', { sections, subjects });
});

// Step 2: load students for that section, show grid
router.get('/mark', async (req, res) => {
  const { sectionId, subjectId, date, period } = req.query;
  const section = await Section.findById(sectionId).populate('students');
  res.render('faculty/mark-attendance', {
    section, sectionId, subjectId, date, period,
    students: section.students,
  });
});

// Step 3: submit grid
router.post('/mark', async (req, res) => {
  const { sectionId, subjectId, date, period, statuses } = req.body;
  // statuses is an object: { studentId: status, ... } from checkbox/radio names

  try {
    let session = await AttendanceSession.findOne({ section: sectionId, subject: subjectId, date, period });
    if (!session) {
      session = await AttendanceSession.create({
        section: sectionId, subject: subjectId, date, period, faculty: req.session.user.id,
      });
    }

    const entries = Object.entries(statuses || {});
    for (const [studentId, status] of entries) {
      await AttendanceRecord.findOneAndUpdate(
        { session: session._id, student: studentId },
        { status, markedBy: req.session.user.id, markedAt: new Date() },
        { upsert: true }
      );
    }

    req.flash('success', 'Attendance saved successfully.');
    res.redirect('/faculty');
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('back');
  }
});

// History view
router.get('/history', async (req, res) => {
  const sessions = await AttendanceSession.find({ faculty: req.session.user.id })
    .populate('subject section')
    .sort({ date: -1 });
  res.render('faculty/history', { sessions });
});

module.exports = router;