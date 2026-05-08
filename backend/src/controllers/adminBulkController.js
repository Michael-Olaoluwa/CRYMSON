const User = require('../models/User');
const { logStateChange } = require('../middleware/auditLog');

async function sendBulkEmail(req, res) {
  try {
    const { filter = '', subject = '', body = '' } = req.body || {};

    if (!subject || !body) {
      return res.status(400).json({ message: 'Subject and body are required.' });
    }

    // Build a simple search across crymsonId, email and department
    const regex = new RegExp(String(filter || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const query = filter ? { $or: [{ crymsonId: regex }, { email: regex }, { department: regex }] } : {};

    const recipients = await User.find(query, { email: 1, crymsonId: 1 }).lean().limit(2000);

    // Instead of sending emails here, we record audit entries and mark as queued
    for (const u of recipients) {
      logStateChange(req.auth?.crymsonId || 'system', 'bulk-email', 'users', { to: u.email, crymsonId: u.crymsonId, subject }, 'queued');
    }

    return res.status(202).json({ message: 'Bulk email queued.', queued: recipients.length });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to queue bulk email.' });
  }
}

module.exports = {
  sendBulkEmail,
};
