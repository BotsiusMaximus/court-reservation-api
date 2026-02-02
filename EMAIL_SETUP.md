# Email Notification System

## Overview

The Court Reservation API now includes automated email notifications for:
- ✅ **Booking Confirmations** - Sent when a reservation is created
- ✅ **Cancellation Notices** - Sent when a reservation is cancelled

---

## Features

### Booking Confirmation Email
**Sent to:** User who made the booking
**Trigger:** Successful reservation creation
**Contains:**
- Confirmation code (large, prominent)
- Court name and facility
- Date and time
- Duration
- Notes (if provided)
- Professional HTML formatting

### Cancellation Notice Email
**Sent to:** User whose booking was cancelled
**Trigger:** Reservation cancellation
**Contains:**
- Confirmation code reference
- Cancelled court details
- Date and time that was cancelled
- Cancellation reason (if provided)
- Professional HTML formatting

---

## Configuration

### Option 1: Gmail (Easiest for Testing)

**1. Enable 2-Factor Authentication** on your Gmail account

**2. Create App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password

**3. Update .env:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=your-app-password-here
FROM_EMAIL=your-gmail@gmail.com
FROM_NAME=Court Reservation System
```

### Option 2: Custom SMTP Server

**Update .env:**
```env
SMTP_HOST=smtp.your-domain.com
SMTP_PORT=587
SMTP_USER=notifications@your-domain.com
SMTP_PASSWORD=your-smtp-password
FROM_EMAIL=notifications@your-domain.com
FROM_NAME=Your Court Name
```

### Option 3: SendGrid (Production Recommended)

**1. Sign up:** https://sendgrid.com (free tier: 100 emails/day)

**2. Get API Key:** Settings → API Keys

**3. Update .env:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
FROM_EMAIL=verified-sender@your-domain.com
FROM_NAME=Court Reservation System
```

**Note:** SendGrid requires email verification before sending.

---

## Testing

### 1. Check Email Service Status

Start the server and look for:
```
✅ Email service ready
```

Or if not configured:
```
⚠️  No SMTP credentials configured. Email notifications disabled.
```

### 2. Send Test Email

```bash
# Login as admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'

# Save token
export TOKEN="your-admin-token"

# Send test email
curl -X POST http://localhost:3000/api/email/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'
```

### 3. Test Booking Flow

```bash
# Create a reservation (will trigger confirmation email)
curl -X POST http://localhost:3000/api/reservations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "court_id": 1,
    "date": "2026-02-10",
    "start_time": "14:00",
    "duration": 60
  }'

# Check your inbox for confirmation email
```

### 4. Test Cancellation Flow

```bash
# Cancel the reservation (will trigger cancellation email)
curl -X DELETE http://localhost:3000/api/reservations/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Testing cancellation emails"}'

# Check your inbox for cancellation notice
```

---

## Email Templates

### Template Features
- ✅ Responsive HTML design
- ✅ Plain text fallback
- ✅ Professional styling (blue theme)
- ✅ Clear call-to-action
- ✅ Mobile-friendly
- ✅ Email client compatible

### Customization

Edit `/src/services/emailService.js` to customize:
- Colors (search for `#2c5282` - primary blue)
- Logos (add `<img>` tags in header)
- Footer content
- Email copy/messaging

---

## Troubleshooting

### "Email service error" on startup

**Causes:**
- Invalid SMTP credentials
- Wrong host/port
- Firewall blocking port 587

**Fix:**
1. Verify .env credentials are correct
2. Test credentials with email client
3. Check firewall allows port 587

### "Failed to send email" in logs

**Causes:**
- SMTP server rejected email
- Daily sending limit reached
- Sender email not verified

**Fix:**
1. Check console logs for specific error
2. Verify sender email with provider
3. Check sending limits (Gmail: 500/day, SendGrid free: 100/day)

### Emails not arriving

**Check:**
1. Spam folder
2. Server logs show "✅ Email sent"
3. Recipient email address correct
4. Email provider quarantine settings

---

## Production Recommendations

### For Small Scale (<1000 emails/day)
- ✅ Use Gmail with app password
- ✅ Free and reliable
- ✅ 500 emails/day limit

### For Medium Scale (1K-10K emails/day)
- ✅ Use SendGrid (free tier: 100/day, paid: $15/month for 40K/month)
- ✅ Better deliverability
- ✅ Analytics and tracking

### For Large Scale (>10K emails/day)
- ✅ Use AWS SES ($0.10 per 1,000 emails)
- ✅ Highly scalable
- ✅ Requires DNS configuration

---

## Email Status in Logs

**Successful send:**
```
✅ Booking confirmation sent: <message-id>
```

**Email not configured (graceful degradation):**
```
📧 Email skipped (not configured): Booking confirmation for user@example.com
```

**Send failed:**
```
❌ Failed to send booking confirmation: Error message
```

**Note:** API continues working even if emails fail. Email sending is non-blocking.

---

## Security Best Practices

✅ **Never commit .env file** - Contains sensitive credentials  
✅ **Use app passwords** - More secure than account passwords  
✅ **Rotate credentials** - Change passwords periodically  
✅ **Monitor sending** - Watch for unusual activity  
✅ **Limit rate** - Prevent abuse with rate limiting  

---

## API Endpoints

### POST /api/email/test
Send a test email (admin only)

**Request:**
```json
{
  "email": "test@example.com"
}
```

**Response (success):**
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "messageId": "<unique-message-id>"
}
```

**Response (not configured):**
```json
{
  "success": false,
  "message": "Failed to send test email",
  "reason": "Email not configured"
}
```

---

## Future Enhancements

Possible additions:
- [ ] Reminder emails (24 hours before booking)
- [ ] Welcome email on registration
- [ ] Password reset emails
- [ ] Booking modification notifications
- [ ] Weekly summary emails
- [ ] Email preferences/unsubscribe

---

**⚡ Email system ready! Configure .env to start sending.**
