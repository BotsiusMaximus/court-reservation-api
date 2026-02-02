const express = require('express');
const { query } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { createReservationValidation } = require('../middleware/validation');
const { NotFoundError, ConflictError, ValidationError, AuthorizationError } = require('../utils/errors');
const { sendBookingConfirmation, sendCancellationNotice } = require('../services/emailService');

const router = express.Router();

// Helper function to generate confirmation code
const generateConfirmationCode = () => {
  const prefix = 'PB';
  const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  const suffix = String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
                 String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
                 String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `${prefix}-${random.slice(0, 3)}-${suffix}`;
};

// Helper function to format Date for PostgreSQL TIMESTAMP (without timezone)
const formatForPostgres = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * @route   POST /api/reservations
 * @desc    Create a new reservation
 * @access  Private
 */
router.post('/', authenticate, createReservationValidation, async (req, res, next) => {
  try {
    const { court_id, date, start_time, duration, notes } = req.body;
    const user_id = req.user.id;

    // Construct start and end timestamps in local time
    const startDateTime = new Date(`${date}T${start_time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    // Validation: Check if booking is in the past
    if (startDateTime < new Date()) {
      throw new ValidationError('Cannot book a time in the past');
    }

    // Get facility rules
    const courtResult = await query(
      `SELECT c.*, f.max_booking_duration_minutes, f.max_advance_booking_days,
              f.opening_time, f.closing_time
       FROM courts c
       JOIN facilities f ON c.facility_id = f.id
       WHERE c.id = $1 AND c.is_active = true`,
      [court_id]
    );

    if (courtResult.rows.length === 0) {
      throw new NotFoundError('Court not found or inactive');
    }

    const court = courtResult.rows[0];

    // Check max booking duration
    if (duration > (court.max_booking_duration_minutes || 120)) {
      throw new ValidationError(`Maximum booking duration is ${court.max_booking_duration_minutes || 120} minutes`);
    }

    // Check advance booking limit
    const maxAdvanceDays = court.max_advance_booking_days || 14;
    const maxAdvanceDate = new Date();
    maxAdvanceDate.setDate(maxAdvanceDate.getDate() + maxAdvanceDays);
    
    if (startDateTime > maxAdvanceDate) {
      throw new ValidationError(`Cannot book more than ${maxAdvanceDays} days in advance`);
    }

    // Check facility operating hours
    const startHour = startDateTime.getHours();
    const startMinute = startDateTime.getMinutes();
    const endHour = endDateTime.getHours();
    const endMinute = endDateTime.getMinutes();
    
    const openingParts = court.opening_time.split(':');
    const closingParts = court.closing_time.split(':');
    const openingMinutes = parseInt(openingParts[0]) * 60 + parseInt(openingParts[1]);
    const closingMinutes = parseInt(closingParts[0]) * 60 + parseInt(closingParts[1]);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (startMinutes < openingMinutes || endMinutes > closingMinutes) {
      throw new ValidationError(`Court operating hours: ${court.opening_time} - ${court.closing_time}`);
    }

    // Check for conflicts using database function
    const startFormatted = formatForPostgres(startDateTime);
    const endFormatted = formatForPostgres(endDateTime);
    
    const conflictCheck = await query(
      'SELECT check_reservation_conflict($1, $2::timestamp, $3::timestamp) as has_conflict',
      [court_id, startFormatted, endFormatted]
    );

    console.log('Conflict check RAW:', JSON.stringify(conflictCheck.rows[0]), 'Type:', typeof conflictCheck.rows[0].has_conflict);
    console.log('Conflict check result:', conflictCheck.rows[0].has_conflict, 'for court', court_id, 'at', startFormatted);

    if (conflictCheck.rows[0].has_conflict) {
      // Get conflicting reservation details for better error message
      const conflictingRes = await query(
        `SELECT start_time, end_time 
         FROM reservations 
         WHERE court_id = $1 
           AND status = 'confirmed'
           AND (
             (start_time <= $2::timestamp AND end_time > $2::timestamp) OR
             (start_time < $3::timestamp AND end_time >= $3::timestamp) OR
             (start_time >= $2::timestamp AND end_time <= $3::timestamp)
           )
         LIMIT 1`,
        [court_id, startFormatted, endFormatted]
      );

      if (conflictingRes.rows.length > 0) {
        const conflict = conflictingRes.rows[0];
        throw new ConflictError(
          `Court is already booked from ${new Date(conflict.start_time).toLocaleTimeString()} to ${new Date(conflict.end_time).toLocaleTimeString()}`
        );
      } else {
        // If we can't get details, still throw a generic error
        throw new ConflictError(
          `Court is already booked at the requested time`
        );
      }
    }

    // Check user's active reservations limit
    const userActiveReservations = await query(
      `SELECT COUNT(*) as count 
       FROM reservations 
       WHERE user_id = $1 
         AND status = 'confirmed' 
         AND end_time > NOW()`,
      [user_id]
    );

    const maxActiveReservations = parseInt(process.env.MAX_ACTIVE_RESERVATIONS_PER_USER || '5');
    if (userActiveReservations.rows[0].count >= maxActiveReservations) {
      throw new ValidationError(`You cannot have more than ${maxActiveReservations} active reservations`);
    }

    // Create reservation
    const confirmationCode = generateConfirmationCode();
    
    const result = await query(
      `INSERT INTO reservations 
       (user_id, court_id, facility_id, start_time, end_time, duration_minutes, confirmation_code, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed')
       RETURNING *`,
      [user_id, court_id, court.facility_id, startDateTime, endDateTime, duration, confirmationCode, notes || null]
    );

    const reservation = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      reservation: {
        id: reservation.id,
        court_id: reservation.court_id,
        court_name: court.name,
        start_time: reservation.start_time,
        end_time: reservation.end_time,
        duration_minutes: reservation.duration_minutes,
        confirmation_code: reservation.confirmation_code,
        status: reservation.status,
      },
    });

    // Send confirmation email (async, don't wait for it)
    sendBookingConfirmation(
      reservation,
      { email: req.user.email, name: req.user.name },
      { ...court, facility_name: court.facility_name || 'Court Facility' }
    ).catch(err => console.error('Email send failed:', err.message));
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/reservations
 * @desc    Get all reservations (admin) or user's reservations
 * @access  Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, upcoming } = req.query;
    const isAdmin = req.user.role === 'admin';

    let queryText = `
      SELECT r.*, c.name as court_name, c.court_number,
             f.name as facility_name, u.name as user_name, u.email as user_email
      FROM reservations r
      JOIN courts c ON r.court_id = c.id
      JOIN facilities f ON r.facility_id = f.id
      JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Non-admin users only see their own reservations
    if (!isAdmin) {
      params.push(req.user.id);
      queryText += ` AND r.user_id = $${params.length}`;
    }

    // Filter by status
    if (status) {
      params.push(status);
      queryText += ` AND r.status = $${params.length}`;
    }

    // Filter upcoming reservations
    if (upcoming === 'true') {
      queryText += ` AND r.start_time > NOW()`;
    }

    queryText += ' ORDER BY r.start_time DESC';

    const result = await query(queryText, params);

    res.json({
      success: true,
      count: result.rows.length,
      reservations: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/reservations/:id
 * @desc    Get single reservation
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT r.*, c.name as court_name, c.court_number,
              f.name as facility_name, u.name as user_name, u.email as user_email
       FROM reservations r
       JOIN courts c ON r.court_id = c.id
       JOIN facilities f ON r.facility_id = f.id
       JOIN users u ON r.user_id = u.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Reservation not found');
    }

    const reservation = result.rows[0];

    // Only allow user to see their own reservation (unless admin)
    if (req.user.role !== 'admin' && reservation.user_id !== req.user.id) {
      throw new AuthorizationError('You can only view your own reservations');
    }

    res.json({
      success: true,
      reservation: reservation,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/reservations/:id
 * @desc    Cancel a reservation
 * @access  Private
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Get reservation details
    const result = await query(
      'SELECT * FROM reservations WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Reservation not found');
    }

    const reservation = result.rows[0];

    // Check authorization (only owner or admin can cancel)
    if (req.user.role !== 'admin' && reservation.user_id !== req.user.id) {
      throw new AuthorizationError('You can only cancel your own reservations');
    }

    // Check if already cancelled
    if (reservation.status === 'cancelled') {
      throw new ValidationError('Reservation is already cancelled');
    }

    // Check cancellation policy (minimum hours before start time)
    const minCancellationHours = parseInt(process.env.MIN_CANCELLATION_HOURS || '2');
    const hoursUntilStart = (new Date(reservation.start_time) - new Date()) / (1000 * 60 * 60);
    
    if (hoursUntilStart < minCancellationHours && req.user.role !== 'admin') {
      throw new ValidationError(`Reservations must be cancelled at least ${minCancellationHours} hours in advance`);
    }

    // Get court details for email
    const courtResult = await query(
      'SELECT c.*, f.name as facility_name FROM courts c JOIN facilities f ON c.facility_id = f.id WHERE c.id = $1',
      [reservation.court_id]
    );
    const court = courtResult.rows[0];

    // Cancel reservation
    await query(
      `UPDATE reservations 
       SET status = 'cancelled', 
           cancelled_at = NOW(),
           cancellation_reason = $1
       WHERE id = $2`,
      [reason || 'User cancelled', id]
    );

    res.json({
      success: true,
      message: 'Reservation cancelled successfully',
    });

    // Send cancellation email (async, don't wait for it)
    sendCancellationNotice(
      { ...reservation, cancellation_reason: reason || 'User cancelled' },
      { email: req.user.email, name: req.user.name },
      court
    ).catch(err => console.error('Email send failed:', err.message));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
