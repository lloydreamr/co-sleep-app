const express = require('express');
const prisma = require('../lib/prisma');
const { hashPassword, comparePassword, generateToken, authenticateUser } = require('../lib/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, username, name, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username: username || null }
        ]
      }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        name,
        password: hashedPassword,
        userType: 'profile', // Default to profile for registered users
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        userType: true,
        isVerified: true,
        createdAt: true
      }
    });
    
    // Generate token
    const token = generateToken(user.id);
    
    res.json({
      user,
      token,
      message: 'User registered successfully'
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user with password
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        password: true,
        userType: true,
        displayName: true,
        isVerified: true,
        sleepTime: true,
        wakeTime: true,
        timezone: true,
        allowAnalytics: true,
        showOnline: true,
        createdAt: true
      }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = generateToken(user.id);
    
    res.json({
      user,
      token,
      message: 'Login successful'
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

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