const express = require('express');
const { hashPassword, comparePassword, generateToken, authenticateUser } = require('../lib/auth');
const { 
  findUserByEmailOrUsername, 
  findUserByEmailWithAuth, 
  findUserById, 
  createUser, 
  updateUserById,
  userExistsByUsername 
} = require('../lib/userSelectors');
const { 
  asyncHandler, 
  ErrorTypes, 
  createSuccessResponse,
  handleDatabaseError 
} = require('../lib/errorHandler');
const { 
  validateRegistrationInput, 
  validateLoginInput, 
  validateProfileUpdateInput 
} = require('../lib/validationUtils');

const router = express.Router();

// Register new user
router.post('/register', asyncHandler(async (req, res) => {
  const { email, username, name, password } = req.body;
  
  // Validate input using centralized validation
  const validation = validateRegistrationInput({ email, username, name, password });
  if (!validation.isValid) {
    const { statusCode, error } = ErrorTypes.VALIDATION_ERROR(validation.errors.join(', '));
    return res.status(statusCode).json(error);
  }
    
    // Check if user already exists using centralized selector
    const existingUser = await findUserByEmailOrUsername(email, username);
    
    if (existingUser) {
      const { statusCode, error } = ErrorTypes.CONFLICT('User already exists');
      return res.status(statusCode).json(error);
    }
    
    // Hash password and create user using centralized operations
    const hashedPassword = await hashPassword(password);
    
    const user = await createUser({
      email,
      username,
      name,
      password: hashedPassword,
      userType: 'profile' // Default to profile for registered users
    });
    
    // Generate token
    const token = generateToken(user.id);
    
    res.json(createSuccessResponse({
      user,
      token
    }, 'User registered successfully'));
}));

// Login user  
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  // Validate input using centralized validation
  const validation = validateLoginInput({ email, password });
  if (!validation.isValid) {
    const { statusCode, error } = ErrorTypes.VALIDATION_ERROR(validation.errors.join(', '));
    return res.status(statusCode).json(error);
  }
    
    // Find user with auth fields using centralized selector
    const user = await findUserByEmailWithAuth(email);
    
    if (!user) {
      const { statusCode, error } = ErrorTypes.UNAUTHORIZED('Invalid credentials');
      return res.status(statusCode).json(error);
    }
    
    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      const { statusCode, error } = ErrorTypes.UNAUTHORIZED('Invalid credentials');
      return res.status(statusCode).json(error);
    }
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    // Generate token
    const token = generateToken(user.id);
    
    res.json(createSuccessResponse({
      user: userWithoutPassword,
      token
    }, 'Login successful'));
}));

// Get current user profile
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        userType: true,
        displayName: true,
        isVerified: true,
        timezone: true,
        sleepTime: true,
        wakeTime: true,
        autoDisconnect: true,
        disconnectTime: true,
        allowAnalytics: true,
        showOnline: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    res.json({ user });
    
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const {
      name,
      username,
      displayName,
      timezone,
      sleepTime,
      wakeTime,
      autoDisconnect,
      disconnectTime,
      allowAnalytics,
      showOnline
    } = req.body;
    
    // Check if username is already taken
    if (username && username !== req.user.username) {
      const existingUser = await prisma.user.findUnique({
        where: { username }
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }
    
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name,
        username,
        displayName,
        timezone,
        sleepTime,
        wakeTime,
        autoDisconnect,
        disconnectTime,
        allowAnalytics,
        showOnline
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        userType: true,
        displayName: true,
        isVerified: true,
        timezone: true,
        sleepTime: true,
        wakeTime: true,
        autoDisconnect: true,
        disconnectTime: true,
        allowAnalytics: true,
        showOnline: true,
        updatedAt: true
      }
    });
    
    res.json({
      user: updatedUser,
      message: 'Profile updated successfully'
    });
    
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user sleep analytics
router.get('/analytics', authenticateUser, async (req, res) => {
  try {
    const analytics = await prisma.sleepAnalytics.findUnique({
      where: { userId: req.user.id }
    });
    
    if (!analytics) {
      // Create analytics record if it doesn't exist
      const newAnalytics = await prisma.sleepAnalytics.create({
        data: { userId: req.user.id }
      });
      return res.json({ analytics: newAnalytics });
    }
    
    res.json({ analytics });
    
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

module.exports = router; 