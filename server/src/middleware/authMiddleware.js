const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ishot_super_secret_jwt_key_2026_secure_session';

/**
 * Authentication middleware that verifies the JWT Bearer token
 * and attaches req.user = { id, email } to the request object.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: No token provided. Please log in.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
    };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired token. Please log in again.',
    });
  }
}

module.exports = authMiddleware;
