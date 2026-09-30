const requireLogin = (req, res, next) => {
  // DEMO MODE: auto-login everyone as admin, no credentials needed
  if (!req.session.user) {
    req.session.user = {
      id: process.env.DEMO_ADMIN_ID, // set this to a real Staff _id in your DB
      name: 'Guest Admin',
      role: 'admin',
    };
  }
  next();
};

const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.session.user.role)) {
    req.flash('error', 'You do not have access to that page.');
    return res.redirect('/');
  }
  next();
};

module.exports = { requireLogin, requireRole };