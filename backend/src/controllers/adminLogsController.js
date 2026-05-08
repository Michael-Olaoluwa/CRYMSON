const { getAuditLog } = require('../middleware/auditLog');

async function listLogs(req, res) {
  try {
    const { userId, limit = 200, offset = 0 } = req.query || {};
    const entries = getAuditLog(userId, Number(limit), Number(offset));
    return res.status(200).json({ logs: entries });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load logs.' });
  }
}

module.exports = {
  listLogs,
};
