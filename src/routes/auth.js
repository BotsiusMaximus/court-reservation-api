const express = require('express');
const bcrypt = require('bcrypt');
const { query } = require('../config/database');
const { generateToken } = require('../utils/jwt');
const { registerValidation, loginValidation } = require('../middleware/validation');
const { ValidationError, AuthenticationError } = require('../utils/errors');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', registerValidation, async (req, res, next) => {
  try {
    const { email, password, name, phone } = req.body;

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existingUser.rows.length > 0) {
      throw new ValidationError('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await query(
      `INSERT INTO users (email, password_hash, name, phone, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, name, phone, role, created_at`,
      [email, passwordHash, name, phone || null, 'user']
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginValidation, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await query(
      'SELECT id, email, password_hash, name, phone, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new AuthenticationError('Invalid email or password');
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      throw new AuthenticationError('Your account has been deactivated');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', require('../middleware/auth').authenticate, async (req, res, next) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
