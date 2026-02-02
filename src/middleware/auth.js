const { verifyToken } = require('../utils/jwt');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const { query } = require('../config/database');

/**
 * Middleware to verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided. Please log in.');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = verifyToken(token);

    // Check if user still exists
    const result = await query(
      'SELECT id, email, name, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      throw new AuthenticationError('User no longer exists');
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new AuthenticationError('Your account has been deactivated');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to restrict access to admin users only
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new AuthenticationError('Please log in first'));
  }

  if (req.user.role !== 'admin') {
    return next(new AuthorizationError('This action requires administrator privileges'));
  }

  next();
};

/**
 * Optional authentication - attaches user if token provided, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      
      const result = await query(
        'SELECT id, email, name, role FROM users WHERE id = $1 AND is_active = true',
        [decoded.id]
      );

      if (result.rows.length > 0) {
        req.user = result.rows[0];
      }
    }
    
    next();
  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
};

module.exports = {
  authenticate,
  requireAdmin,
  optionalAuth,
};
