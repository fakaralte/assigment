const express = require('express');
const router = express.Router();
const { requireLogin, requireRole } = require('../middleware/auth');

const Section = require('../models/Section');
const Subject = require('../models/Subject');
const Staff = require('../models/Staff');
const Classroom = require('../models/Classroom');
const TimetableEntry = require('../models/TimetableEntry');
const { DAYS } = require('../models/TimetableEntry');

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

router.use(requireLogin, requireRole('admin', 'hod'));

// ---------- CLASSROOMS (setup) ----------
router.get('/classrooms', async (req, res) => {
  const classrooms = await Classroom.find();
  res.render('timetable/classrooms', { classrooms });
});

router.post('/classrooms', async (req, res) => {
  try {
    await Classroom.create(req.body);
    req.flash('success', 'Classroom added.');
  } catch (err) {
    req.flash('error', err.message);
  }
  res.redirect('/timetable/classrooms');
});

router.post('/classrooms/:id/delete', async (req, res) => {
  await Classroom.findByIdAndDelete(req.params.id);
  req.flash('success', 'Classroom removed.');
  res.redirect('/timetable/classrooms');
});

// ---------- VIEW TIMETABLE FOR A SECTION ----------
router.get('/', async (req, res) => {
  const sections = await Section.find();
  const { sectionId } = req.query;

  let grid = null;
  let selectedSection = null;

  if (sectionId) {
    selectedSection = await Section.findById(sectionId);
    const entries = await TimetableEntry.find({ section: sectionId })
      .populate('subject faculty classroom');

    // build a day x period grid for easy EJS rendering
    grid = {};
    DAYS.forEach(day => {
      grid[day] = {};
      PERIODS.forEach(p => { grid[day][p] = null; });
    });
    entries.forEach(e => { grid[e.day][e.period] = e; });
  }

  res.render('timetable/view', { sections, sectionId, selectedSection, grid, DAYS, PERIODS });
});

// ---------- MANUAL ENTRY (with conflict feedback) ----------
router.get('/manual', async (req, res) => {
  const sections = await Section.find();
  const subjects = await Subject.find();
  const staff = await Staff.find({ role: { $in: ['faculty', 'hod'] } });
  const classrooms = await Classroom.find();
  res.render('timetable/manual', { sections, subjects, staff, classrooms, DAYS, PERIODS });
});

router.post('/manual', async (req, res) => {
  const { section, subject, faculty, classroom, day, period } = req.body;
  try {
    await TimetableEntry.create({ section, subject, faculty, classroom, day, period });
    req.flash('success', 'Slot added to timetable.');
  } catch (err) {
    if (err.code === 11000) {
      // figure out which constraint tripped, for a useful message
      const key = Object.keys(err.keyPattern)[0];
      const reason = key === 'section' ? 'This section already has a class at that day/period.'
        : key === 'faculty' ? 'This faculty member is already teaching another class at that day/period.'
        : 'This classroom is already booked at that day/period.';
      req.flash('error', `Conflict: ${reason}`);
    } else {
      req.flash('error', err.message);
    }
  }
  res.redirect(`/timetable/manual`);
});

router.post('/entry/:id/delete', async (req, res) => {
  await TimetableEntry.findByIdAndDelete(req.params.id);
  req.flash('success', 'Slot removed.');
  res.redirect('back');
});

// ---------- AUTO-GENERATE FOR A SECTION ----------
router.get('/generate', async (req, res) => {
  const sections = await Section.find();
  res.render('timetable/generate', { sections });
});

router.post('/generate', async (req, res) => {
  const { sectionId } = req.body;
  const section = await Section.findById(sectionId);
  if (!section) {
    req.flash('error', 'Section not found.');
    return res.redirect('/timetable/generate');
  }

  const subjects = await Subject.find({ department: section.department, semester: section.semester });
  const classrooms = await Classroom.find();
  const staff = await Staff.find({ subjectsTaught: { $in: subjects.map(s => s._id) } });

  if (!subjects.length || !classrooms.length || !staff.length) {
    req.flash('error', 'Missing subjects, classrooms, or faculty for this department/semester. Set those up first.');
    return res.redirect('/timetable/generate');
  }

  // clear any existing entries for this section before regenerating
  await TimetableEntry.deleteMany({ section: sectionId });

  const placed = [];
  const unplaced = [];

  // build all slots (day, period) in a shuffled-ish order for spread
  const allSlots = [];
  DAYS.forEach(day => PERIODS.forEach(period => allSlots.push({ day, period })));

  for (const subject of subjects) {
    const teachers = staff.filter(s => s.subjectsTaught.some(id => id.equals(subject._id)));
    if (!teachers.length) {
      unplaced.push({ subject: subject.name, reason: 'No faculty assigned to teach this subject' });
      continue;
    }

    let neededCount = subject.weeklyPeriods || 4;
    let slotIndex = 0;

    while (neededCount > 0 && slotIndex < allSlots.length) {
      const { day, period } = allSlots[slotIndex];
      slotIndex++;

      // check section is free at this slot (in-memory, since we track `placed`)
      const sectionBusy = placed.some(p => p.day === day && p.period === period);
      if (sectionBusy) continue;

      // find a teacher free at this slot
      const freeTeacher = teachers.find(t =>
        !placed.some(p => p.day === day && p.period === period && p.faculty.equals(t._id))
      );
      if (!freeTeacher) continue;

      // find a free classroom at this slot
      const freeRoom = classrooms.find(c =>
        !placed.some(p => p.day === day && p.period === period && p.classroom.equals(c._id))
      );
      if (!freeRoom) continue;

      placed.push({
        section: section._id, subject: subject._id, faculty: freeTeacher._id,
        classroom: freeRoom._id, day, period,
      });
      neededCount--;
    }

    if (neededCount > 0) {
      unplaced.push({ subject: subject.name, reason: `Could only place ${(subject.weeklyPeriods || 4) - neededCount}/${subject.weeklyPeriods || 4} periods — no free slot/teacher/room combination left` });
    }
  }

  if (placed.length) {
    await TimetableEntry.insertMany(placed);
  }

  if (unplaced.length) {
    req.flash('error', `Generated with ${unplaced.length} issue(s): ` + unplaced.map(u => `${u.subject} (${u.reason})`).join('; '));
  } else {
    req.flash('success', 'Timetable generated successfully with no conflicts.');
  }

  res.redirect(`/timetable?sectionId=${sectionId}`);
});

module.exports = router;