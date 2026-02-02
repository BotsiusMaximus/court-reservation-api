const express = require('express');
const { query } = require('../config/database');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');
const { courtValidation, availabilityValidation } = require('../middleware/validation');
const { NotFoundError } = require('../utils/errors');

const router = express.Router();

/**
 * @route   GET /api/courts
 * @desc    Get all courts (with optional facility filter)
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    const { facility_id, is_active } = req.query;
    
    let queryText = `
      SELECT c.*, f.name as facility_name, f.address as facility_address
      FROM courts c
      JOIN facilities f ON c.facility_id = f.id
      WHERE 1=1
    `;
    const params = [];

    if (facility_id) {
      params.push(facility_id);
      queryText += ` AND c.facility_id = $${params.length}`;
    }

    if (is_active !== undefined) {
      params.push(is_active === 'true');
      queryText += ` AND c.is_active = $${params.length}`;
    }

    queryText += ' ORDER BY c.facility_id, c.court_number';

    const result = await query(queryText, params);

    res.json({
      success: true,
      count: result.rows.length,
      courts: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/courts/:id
 * @desc    Get single court by ID
 * @access  Public
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT c.*, f.name as facility_name, f.address as facility_address,
              f.opening_time, f.closing_time
       FROM courts c
       JOIN facilities f ON c.facility_id = f.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Court not found');
    }

    res.json({
      success: true,
      court: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/courts/:id/schedule
 * @desc    Get court schedule/availability for a specific date
 * @access  Public
 */
router.get('/:id/schedule', availabilityValidation, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    // Check if court exists
    const courtResult = await query('SELECT * FROM courts WHERE id = $1', [id]);
    
    if (courtResult.rows.length === 0) {
      throw new NotFoundError('Court not found');
    }

    // Get all reservations for this court on this date
    const reservations = await query(
      `SELECT r.*, u.name as user_name, u.email as user_email
       FROM reservations r
       JOIN users u ON r.user_id = u.id
       WHERE r.court_id = $1 
         AND DATE(r.start_time) = $2
         AND r.status = 'confirmed'
       ORDER BY r.start_time`,
      [id, date]
    );

    res.json({
      success: true,
      court: courtResult.rows[0],
      date,
      reservations: reservations.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/courts
 * @desc    Create a new court (admin only)
 * @access  Private/Admin
 */
router.post('/', authenticate, requireAdmin, courtValidation, async (req, res, next) => {
  try {
    const { name, facility_id, court_number, surface_type, is_indoor, notes } = req.body;

    const result = await query(
      `INSERT INTO courts (name, facility_id, court_number, surface_type, is_indoor, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, facility_id, court_number || null, surface_type || 'hard court', is_indoor || false, notes || null]
    );

    res.status(201).json({
      success: true,
      message: 'Court created successfully',
      court: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/courts/:id
 * @desc    Update a court (admin only)
 * @access  Private/Admin
 */
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, surface_type, is_indoor, is_active, notes } = req.body;

    const result = await query(
      `UPDATE courts 
       SET name = COALESCE($1, name),
           surface_type = COALESCE($2, surface_type),
           is_indoor = COALESCE($3, is_indoor),
           is_active = COALESCE($4, is_active),
           notes = COALESCE($5, notes)
       WHERE id = $6
       RETURNING *`,
      [name, surface_type, is_indoor, is_active, notes, id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Court not found');
    }

    res.json({
      success: true,
      message: 'Court updated successfully',
      court: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/courts/:id
 * @desc    Delete a court (admin only)
 * @access  Private/Admin
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM courts WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Court not found');
    }

    res.json({
      success: true,
      message: 'Court deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
