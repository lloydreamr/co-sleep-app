const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('./prisma');

// Hash password
async function hashPassword(password) {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Compare password
async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
function generateToken(userId) {
  const payload = { userId };
  const options = { expiresIn: '7d' };
  return jwt.sign(payload, process.env.JWT_SECRET, options);
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Middleware to authenticate requests
async function authenticateUser(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        userType: true,
        displayName: true,
        isVerified: true,
        sleepTime: true,
        wakeTime: true,
        timezone: true,
        allowAnalytics: true,
        showOnline: true
      }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

// Hence Enhancement: Middleware for verified users only
async function verifiedUserOnly(req, res, next) {
  try {
    // Check if user is already authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // For now, profile users are considered verified
    // This can be enhanced later with actual verification logic
    const isVerified = req.user.userType === 'profile' || req.user.isVerified;
    
    if (!isVerified) {
      return res.status(403).json({ 
        error: 'Verified account required',
        message: 'This feature is only available to verified users. Please create a profile to access this feature.'
      });
    }
    
    req.user.isVerified = isVerified;
    next();
  } catch (error) {
    console.error('Verification check error:', error);
    res.status(500).json({ error: 'Verification check failed' });
  }
}

// Hence Enhancement: Middleware for anonymous or verified users (flexible access)
async function flexibleAuth(req, res, next) {
  try {
    // Try to authenticate, but don't require it
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
            userType: true,
            displayName: true,
            isVerified: true,
            sleepTime: true,
            wakeTime: true,
            timezone: true,
            allowAnalytics: true,
            showOnline: true
          }
        });
        
        if (user) {
          req.user = user;
          req.user.isVerified = user.userType === 'profile' || user.isVerified;
        }
      }
    }
    
    // Continue regardless of authentication status
    next();
  } catch (error) {
    console.error('Flexible auth error:', error);
    // Continue even on error - this is flexible auth
    next();
  }
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  authenticateUser,
  verifiedUserOnly,
  flexibleAuth
}; 