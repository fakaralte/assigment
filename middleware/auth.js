const requireLogin = (req, res, next) => {
  if (!req.session.user) return res.redirect('/login');
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