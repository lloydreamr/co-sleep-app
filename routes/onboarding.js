const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { generateToken } = require('../lib/auth');
const prisma = new PrismaClient();

// POST /api/onboarding/start
router.post('/start', async (req, res) => {
  const { path } = req.body;
  if (!['anonymous', 'profile'].includes(path)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  
  // Check database connection
  try {
    await prisma.$connect();
  } catch (error) {
    console.error('Database connection error:', error);
    return res.status(500).json({ 
      error: 'Database connection failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
  
  try {
    const user = await prisma.user.create({
      data: {
        userType: path,
        onboardingStep: path === 'anonymous' ? 'consent' : 'profile',
      },
    });
    res.json({ userId: user.id, userType: user.userType, onboardingStep: user.onboardingStep });
  } catch (err) {
    console.error('Onboarding start error:', err);
    
    // Provide more specific error messages
    if (err.code === 'P2002') {
      res.status(400).json({ error: 'User already exists' });
    } else if (err.code === 'P2025') {
      res.status(404).json({ error: 'Database record not found' });
    } else {
      res.status(500).json({ 
        error: 'Failed to start onboarding',
        details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
      });
    }
  }
});

// POST /api/onboarding/profile
router.post('/profile', async (req, res) => {
  const { userId, displayName, genderIdentity, matchPreference } = req.body;
  if (!userId || !displayName || !genderIdentity || !matchPreference) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        displayName,
        genderIdentity,
        matchPreference,
        onboardingStep: 'consent',
      },
    });
    res.json({ success: true, userId: user.id, onboardingStep: user.onboardingStep });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/onboarding/consent
router.post('/consent', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        consentGiven: true,
        onboardingStep: 'complete',
        isVerified: true, // Mark as verified after completing onboarding
      },
    });
    
    // Generate JWT token for authenticated access to Phase 3 features
    const token = generateToken(user.id);
    
    res.json({ 
      success: true, 
      userId: user.id, 
      onboardingStep: user.onboardingStep,
      token: token // Return token for authentication
    });
  } catch (err) {
    console.error('Consent error:', err);
    res.status(500).json({ error: 'Failed to record consent' });
  }
});

// GET /api/user/:userId
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      userId: user.id,
      userType: user.userType,
      displayName: user.displayName,
      genderIdentity: user.genderIdentity,
      matchPreference: user.matchPreference,
      consentGiven: user.consentGiven,
      onboardingStep: user.onboardingStep,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    console.error('User fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router; 