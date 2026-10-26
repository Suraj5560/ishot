const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'ishot_super_secret_jwt_key_2026_secure_session';
const JWT_EXPIRES_IN = '7d';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * POST /api/auth/register
 * Register a new user with email and password (minimum 8 characters).
 */
async function register(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address',
      });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email already exists',
      });
    }

    // Hash password and save
    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Log in an existing user with generic error messages.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Returns the currently authenticated user.
 */
async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  getMe,
};
