const express = require('express');
const router = express.Router();
const { requireLogin, requireRole } = require('../middleware/auth');

const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Section = require('../models/Section');
const Faculty = require('../models/Staff');
const AttendanceRecord = require('../models/AttendanceRecord');
const CorrectionRequest = require('../models/CorrectionRequest');

router.use(requireLogin, requireRole('admin', 'hod'));

// ---------- DASHBOARD ----------
router.get('/', (req, res) => res.redirect('/admin/low-attendance'));

// ---------- LOW ATTENDANCE REPORT ----------
router.get('/low-attendance', async (req, res) => {
  const threshold = Number(req.query.threshold) || 75;

  const report = await AttendanceRecord.aggregate([
    { $group: {
        _id: '$student',
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $ne: ['$status', 'absent'] }, 1, 0] } }
    }},
    { $addFields: { percentage: { $multiply: [{ $divide: ['$present', '$total'] }, 100] } } },
    { $match: { percentage: { $lt: threshold } } },
    { $lookup: { from: 'students', localField: '_id', foreignField: '_id', as: 'student' } },
    { $unwind: '$student' },
    { $sort: { percentage: 1 } }
  ]);

  res.render('admin/low-attendance', { report, threshold });
});

// ---------- CORRECTION APPROVALS ----------
router.get('/corrections', async (req, res) => {
  const requests = await CorrectionRequest.find({ status: 'pending' })
    .populate({ path: 'attendanceRecord', populate: 'student' })
    .populate('requestedBy');
  res.render('admin/corrections', { requests });
});

router.post('/corrections/:id/decide', async (req, res) => {
  const { decision } = req.body;
  const request = await CorrectionRequest.findById(req.params.id);
  request.status = decision;
  request.approvedBy = req.session.user.id;
  await request.save();

  if (decision === 'approved') {
    await AttendanceRecord.findByIdAndUpdate(request.attendanceRecord, { status: request.newStatus });
  }

  req.flash('success', `Request ${decision}.`);
  res.redirect('/admin/corrections');
});

// ---------- STUDENTS ----------
router.get('/students', async (req, res) => {
  const students = await Student.find().populate('section');
  const sections = await Section.find();
  res.render('admin/manage-students', { students, sections });
});

router.post('/students', async (req, res) => {
  try {
    await Student.create(req.body);
    req.flash('success', 'Student added successfully.');
  } catch (err) {
    req.flash('error', err.message);
  }
  res.redirect('/admin/students');
});

router.post('/students/:id/delete', async (req, res) => {
  await Student.findByIdAndDelete(req.params.id);
  req.flash('success', 'Student removed.');
  res.redirect('/admin/students');
});

// ---------- SUBJECTS ----------
router.get('/subjects', async (req, res) => {
  const subjects = await Subject.find();
  res.render('admin/manage-subjects', { subjects });
});

router.post('/subjects', async (req, res) => {
  try {
    await Subject.create(req.body);
    req.flash('success', 'Subject added successfully.');
  } catch (err) {
    req.flash('error', err.message);
  }
  res.redirect('/admin/subjects');
});

router.post('/subjects/:id/delete', async (req, res) => {
  await Subject.findByIdAndDelete(req.params.id);
  req.flash('success', 'Subject removed.');
  res.redirect('/admin/subjects');
});

// ---------- SECTIONS ----------
router.get('/sections', async (req, res) => {
  const sections = await Section.find().populate('students');
  const students = await Student.find();
  res.render('admin/manage-sections', { sections, students });
});

router.post('/sections', async (req, res) => {
  try {
    await Section.create({ ...req.body, students: [] });
    req.flash('success', 'Section created successfully.');
  } catch (err) {
    req.flash('error', err.message);
  }
  res.redirect('/admin/sections');
});

router.post('/sections/:id/add-student', async (req, res) => {
  await Section.findByIdAndUpdate(req.params.id, {
    $addToSet: { students: req.body.studentId },
  });
  await Student.findByIdAndUpdate(req.body.studentId, { section: req.params.id });
  req.flash('success', 'Student added to section.');
  res.redirect('/admin/sections');
});

router.post('/sections/:id/delete', async (req, res) => {
  await Section.findByIdAndDelete(req.params.id);
  req.flash('success', 'Section removed.');
  res.redirect('/admin/sections');
});

// ---------- FACULTY ----------
router.get('/faculty-list', async (req, res) => {
  const facultyList = await Faculty.find().populate('subjectsTaught');
  const subjects = await Subject.find();
  res.render('admin/manage-faculty', { facultyList, subjects });
});

router.post('/faculty-list', async (req, res) => {
  try {
    const { subjectsTaught, ...rest } = req.body;
    await Faculty.create({
      ...rest,
      subjectsTaught: subjectsTaught ? [].concat(subjectsTaught) : [],
    });
    req.flash('success', 'Faculty member added successfully.');
  } catch (err) {
    req.flash('error', err.message);
  }
  res.redirect('/admin/faculty-list');
});

router.post('/faculty-list/:id/delete', async (req, res) => {
  await Faculty.findByIdAndDelete(req.params.id);
  req.flash('success', 'Faculty member removed.');
  res.redirect('/admin/faculty-list');
});

module.exports = router;