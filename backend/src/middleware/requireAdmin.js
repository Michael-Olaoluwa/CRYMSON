function requireAdmin(req, res, next) {
  const isAdmin = Boolean(req.auth?.isAdmin);

  if (!isAdmin) {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  return next();
}

module.exports = {
  requireAdmin
};
