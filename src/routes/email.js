const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { sendTestEmail } = require('../services/emailService');

const router = express.Router();

/**
 * @route   POST /api/email/test
 * @desc    Send test email (admin only)
 * @access  Private/Admin
 */
router.post('/test', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required',
      });
    }

    const result = await sendTestEmail(email);

    if (result.success) {
      res.json({
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        reason: result.reason || result.error,
      });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
