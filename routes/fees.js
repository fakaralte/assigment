const express = require('express');
const router = express.Router();
const { requireLogin, requireRole } = require('../middleware/auth');

const Student = require('../models/Student');
const FeeHead = require('../models/FeeHead');
const StudentFeeAssignment = require('../models/StudentFeeAssignment');
const Installment = require('../models/Installment');
const Transaction = require('../models/Transaction');
const Discount = require('../models/Discount');

router.use(requireLogin, requireRole('accounts', 'admin'));

// ---------- DASHBOARD ----------
router.get('/dashboard', async (req, res) => {
  const totalCollected = await Transaction.aggregate([
    { $match: { type: 'payment', status: 'success' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const totalReversed = await Transaction.aggregate([
    { $match: { type: 'reversal', status: 'success' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  res.render('dashboard', {
    collected: totalCollected[0]?.total || 0,
    reversed: totalReversed[0]?.total || 0,
  });
});

// ---------- FEE HEADS ----------
router.get('/fee-heads', async (req, res) => {
  const feeHeads = await FeeHead.find();
  res.render('fee-heads', { feeHeads });
});

router.post('/fee-heads', async (req, res) => {
  try {
    await FeeHead.create(req.body);
    req.flash('success', 'Fee head created.');
  } catch (err) {
    req.flash('error', err.message);
  }
res.redirect('/fees/fee-heads');
});

// ---------- ASSIGN FEES TO STUDENT ----------
router.get('/assign-fee', async (req, res) => {
  const students = await Student.find();
  const feeHeads = await FeeHead.find();
  res.render('assign-fee', { students, feeHeads });
});

router.post('/assign-fee', async (req, res) => {
  const { student, feeHead, totalAmount, discount, dueDate, installmentCount } = req.body;
  try {
    const assignment = await StudentFeeAssignment.create({
      student, feeHead, totalAmount, discount: discount || 0, dueDate,
    });

    // split into installments
    const count = Number(installmentCount) || 1;
    const perInstallment = Math.round((totalAmount - (discount || 0)) / count);
    const installments = [];
    for (let i = 0; i < count; i++) {
      installments.push({
        feeAssignment: assignment._id,
        amount: perInstallment,
        dueDate,
        status: 'pending',
      });
    }
    await Installment.insertMany(installments);

    req.flash('success', 'Fee assigned and installments created.');
  } catch (err) {
    req.flash('error', err.message);
  }
 res.redirect('/fees/assign-fee');
});

// ---------- STUDENT FEE STATUS ----------
router.get('/student/:studentId', async (req, res) => {
  const student = await Student.findById(req.params.studentId);
  const assignments = await StudentFeeAssignment.find({ student: req.params.studentId }).populate('feeHead');

  const assignmentData = [];
  for (const a of assignments) {
    const installments = await Installment.find({ feeAssignment: a._id });
    const installmentIds = installments.map(i => i._id);
    const transactions = await Transaction.find({ installment: { $in: installmentIds }, status: 'success' });

    const paid = transactions.reduce((sum, t) => sum + (t.type === 'payment' ? t.amount : -t.amount), 0);
    assignmentData.push({ assignment: a, installments, paid, balance: a.totalAmount - a.discount - paid });
  }

  res.render('student-fee-status', { student, assignmentData });
});

// ---------- RECORD PAYMENT ----------
router.get('/pay/:installmentId', async (req, res) => {
  const installment = await Installment.findById(req.params.installmentId)
    .populate({ path: 'feeAssignment', populate: ['student', 'feeHead'] });
  res.render('record-payment', { installment });
});

router.post('/pay/:installmentId', async (req, res) => {
  const { amount, method, referenceId } = req.body;
  try {
    const installment = await Installment.findById(req.params.installmentId).populate('feeAssignment');

    await Transaction.create({
      installment: installment._id,
      student: installment.feeAssignment.student,
      amount,
      type: 'payment',
      method,
      status: 'success',
      referenceId,
      recordedBy: req.session.user.id,
    });

    // recompute installment status
    const txns = await Transaction.find({ installment: installment._id, status: 'success' });
    const totalPaid = txns.reduce((sum, t) => sum + (t.type === 'payment' ? t.amount : -t.amount), 0);
    installment.status = totalPaid >= installment.amount ? 'paid' : 'pending';
    await installment.save();

    req.flash('success', 'Payment recorded.');
   res.redirect(`/fees/student/${installment.feeAssignment.student}`);
  } catch (err) {
    if (err.code === 11000) {
      req.flash('error', 'Duplicate reference ID — payment already recorded.');
    } else {
      req.flash('error', err.message);
    }
    res.redirect('back');
  }
});

// ---------- REVERSAL (admin only) ----------
router.post('/reverse/:transactionId', requireRole('admin'), async (req, res) => {
  const { reason } = req.body;
  const original = await Transaction.findById(req.params.transactionId);

  await Transaction.create({
    installment: original.installment,
    student: original.student,
    amount: original.amount,
    type: 'reversal',
    method: original.method,
    status: 'success',
    referenceId: `REV-${original.referenceId}-${Date.now()}`,
    recordedBy: req.session.user.id,
    reason,
  });

  const installment = await Installment.findById(original.installment);
  installment.status = 'pending';
  await installment.save();

  req.flash('success', 'Payment reversed.');
res.redirect(`/fees/student/${original.student}`);
});

// ---------- OUTSTANDING DUES REPORT (the "wow" screen) ----------
router.get('/reports/outstanding', async (req, res) => {
  const installments = await Installment.find({ status: { $ne: 'paid' } })
    .populate({ path: 'feeAssignment', populate: ['student', 'feeHead'] });

  const report = [];
  for (const inst of installments) {
    const txns = await Transaction.find({ installment: inst._id, status: 'success' });
    const paid = txns.reduce((sum, t) => sum + (t.type === 'payment' ? t.amount : -t.amount), 0);
    const balance = inst.amount - paid;
    if (balance > 0) {
      report.push({
        student: inst.feeAssignment.student,
        feeHead: inst.feeAssignment.feeHead,
        dueDate: inst.dueDate,
        balance,
        overdue: new Date(inst.dueDate) < new Date(),
      });
    }
  }
  report.sort((a, b) => b.balance - a.balance);

  res.render('outstanding-report', { report });
});

module.exports = router;