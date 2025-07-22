const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/onboarding/start
router.post('/start', async (req, res) => {
  const { path } = req.body;
  if (!['anonymous', 'profile'].includes(path)) {
    return res.status(400).json({ error: 'Invalid path' });
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
    res.status(500).json({ error: 'Failed to start onboarding' });
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
      },
    });
    res.json({ success: true, userId: user.id, onboardingStep: user.onboardingStep });
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