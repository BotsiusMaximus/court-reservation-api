const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Email service for sending notifications
 * Supports multiple transports (SMTP, Gmail, etc.)
 */

// Create reusable transporter
let transporter;

// Initialize transporter based on environment
const initializeTransporter = () => {
  const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  };

  // If no SMTP config, use test account for development
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.log('⚠️  No SMTP credentials configured. Email notifications disabled.');
    console.log('   Set SMTP_USER and SMTP_PASSWORD in .env to enable emails.');
    return null;
  }

  transporter = nodemailer.createTransport(emailConfig);

  // Verify connection
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email service error:', error.message);
      transporter = null;
    } else {
      console.log('✅ Email service ready');
    }
  });

  return transporter;
};

// Initialize on module load
initializeTransporter();

/**
 * Send booking confirmation email
 * @param {Object} booking - Reservation details
 * @param {Object} user - User details
 * @param {Object} court - Court details
 */
const sendBookingConfirmation = async (booking, user, court) => {
  if (!transporter) {
    console.log('📧 Email skipped (not configured): Booking confirmation for', user.email);
    return { success: false, reason: 'Email not configured' };
  }

  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);

  const mailOptions = {
    from: `"${process.env.FROM_NAME || 'Court Reservation'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
    to: user.email,
    subject: `Booking Confirmed - ${court.name} on ${startTime.toLocaleDateString()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2c5282; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f7fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .detail-row { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
          .label { font-weight: bold; color: #2c5282; }
          .confirmation-code { background: #2c5282; color: white; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; border-radius: 4px; margin: 20px 0; letter-spacing: 2px; }
          .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎾 Booking Confirmed!</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name},</p>
            <p>Your court reservation has been confirmed. Here are your booking details:</p>
            
            <div class="confirmation-code">
              ${booking.confirmation_code}
            </div>
            
            <div class="detail-row">
              <span class="label">Court:</span> ${court.name}
            </div>
            
            <div class="detail-row">
              <span class="label">Date:</span> ${startTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            
            <div class="detail-row">
              <span class="label">Time:</span> ${startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            
            <div class="detail-row">
              <span class="label">Duration:</span> ${booking.duration_minutes} minutes
            </div>
            
            ${court.facility_name ? `
            <div class="detail-row">
              <span class="label">Location:</span> ${court.facility_name}
            </div>
            ` : ''}
            
            ${booking.notes ? `
            <div class="detail-row">
              <span class="label">Notes:</span> ${booking.notes}
            </div>
            ` : ''}
            
            <p style="margin-top: 30px;">See you on the court! 🏓</p>
            
            <div class="footer">
              <p>Need to cancel? Log in to your account to manage your bookings.</p>
              <p style="margin-top: 10px; color: #999;">This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Booking Confirmed!

Hi ${user.name},

Your court reservation has been confirmed.

Confirmation Code: ${booking.confirmation_code}

Details:
- Court: ${court.name}
- Date: ${startTime.toLocaleDateString()}
- Time: ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}
- Duration: ${booking.duration_minutes} minutes
${court.facility_name ? `- Location: ${court.facility_name}` : ''}
${booking.notes ? `- Notes: ${booking.notes}` : ''}

See you on the court!

---
Need to cancel? Log in to your account to manage your bookings.
    `.trim(),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Booking confirmation sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send booking confirmation:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send cancellation notification email
 * @param {Object} booking - Reservation details
 * @param {Object} user - User details
 * @param {Object} court - Court details
 */
const sendCancellationNotice = async (booking, user, court) => {
  if (!transporter) {
    console.log('📧 Email skipped (not configured): Cancellation notice for', user.email);
    return { success: false, reason: 'Email not configured' };
  }

  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);

  const mailOptions = {
    from: `"${process.env.FROM_NAME || 'Court Reservation'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
    to: user.email,
    subject: `Booking Cancelled - ${court.name} on ${startTime.toLocaleDateString()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #c53030; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f7fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .detail-row { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
          .label { font-weight: bold; color: #c53030; }
          .alert { background: #fed7d7; border-left: 4px solid #c53030; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Cancelled</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name},</p>
            
            <div class="alert">
              Your court reservation has been cancelled.
            </div>
            
            <p>Cancelled booking details:</p>
            
            <div class="detail-row">
              <span class="label">Confirmation Code:</span> ${booking.confirmation_code}
            </div>
            
            <div class="detail-row">
              <span class="label">Court:</span> ${court.name}
            </div>
            
            <div class="detail-row">
              <span class="label">Date:</span> ${startTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            
            <div class="detail-row">
              <span class="label">Time:</span> ${startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            
            ${booking.cancellation_reason ? `
            <div class="detail-row">
              <span class="label">Reason:</span> ${booking.cancellation_reason}
            </div>
            ` : ''}
            
            <p style="margin-top: 30px;">Want to book again? Log in to browse available court times.</p>
            
            <div class="footer">
              <p>Questions? Contact us for assistance.</p>
              <p style="margin-top: 10px; color: #999;">This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Booking Cancelled

Hi ${user.name},

Your court reservation has been cancelled.

Details:
- Confirmation Code: ${booking.confirmation_code}
- Court: ${court.name}
- Date: ${startTime.toLocaleDateString()}
- Time: ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}
${booking.cancellation_reason ? `- Reason: ${booking.cancellation_reason}` : ''}

Want to book again? Log in to browse available court times.

---
Questions? Contact us for assistance.
    `.trim(),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Cancellation notice sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send cancellation notice:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send test email (for configuration verification)
 */
const sendTestEmail = async (toEmail) => {
  if (!transporter) {
    return { success: false, reason: 'Email not configured' };
  }

  const mailOptions = {
    from: `"${process.env.FROM_NAME || 'Court Reservation'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Test Email - Court Reservation System',
    html: '<h1>Email Service is Working!</h1><p>This is a test email from your Court Reservation API.</p>',
    text: 'Email Service is Working! This is a test email from your Court Reservation API.',
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendBookingConfirmation,
  sendCancellationNotice,
  sendTestEmail,
};
