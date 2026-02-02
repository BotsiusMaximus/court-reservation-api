const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    throw new ValidationError(errorMessages);
  }
  next();
};

/**
 * Validation rules for user registration
 */
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),
  body('phone')
    .optional()
    .matches(/^[\d\s\-\(\)\+]+$/)
    .withMessage('Please provide a valid phone number'),
  validate,
];

/**
 * Validation rules for login
 */
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validate,
];

/**
 * Validation rules for creating a reservation
 */
const createReservationValidation = [
  body('court_id')
    .isInt({ min: 1 })
    .withMessage('Valid court ID is required'),
  body('date')
    .isDate()
    .withMessage('Valid date is required (YYYY-MM-DD)'),
  body('start_time')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Valid start time is required (HH:MM format)'),
  body('duration')
    .isInt({ min: 30, max: 240 })
    .withMessage('Duration must be between 30 and 240 minutes'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters'),
  validate,
];

/**
 * Validation rules for court availability query
 */
const availabilityValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid court ID is required'),
  query('date')
    .isDate()
    .withMessage('Valid date is required (YYYY-MM-DD)'),
  validate,
];

/**
 * Validation rules for creating/updating a court
 */
const courtValidation = [
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Court name must be at least 2 characters'),
  body('facility_id')
    .isInt({ min: 1 })
    .withMessage('Valid facility ID is required'),
  body('court_number')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Court number must be a positive integer'),
  body('surface_type')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Surface type must be at least 2 characters'),
  body('is_indoor')
    .optional()
    .isBoolean()
    .withMessage('is_indoor must be a boolean'),
  validate,
];

/**
 * Validation rules for creating/updating a facility
 */
const facilityValidation = [
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Facility name must be at least 2 characters'),
  body('address')
    .optional()
    .trim(),
  body('phone')
    .optional()
    .matches(/^[\d\s\-\(\)\+]+$/)
    .withMessage('Please provide a valid phone number'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('opening_time')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
    .withMessage('Opening time must be in HH:MM:SS format'),
  body('closing_time')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
    .withMessage('Closing time must be in HH:MM:SS format'),
  validate,
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  createReservationValidation,
  availabilityValidation,
  courtValidation,
  facilityValidation,
};
