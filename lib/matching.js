/**
 * Advanced Matching Algorithm for Hence App
 * Phase 3: Intelligent matching based on user preferences, compatibility, and behavior
 * @module lib/matching
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calculate compatibility score between two users
 * @param {Object} user1 - First user data
 * @param {Object} user2 - Second user data
 * @returns {number} Compatibility score (0-1)
 */
function calculateCompatibilityScore(user1, user2) {
  let score = 0;
  let factors = 0;

  // Gender preference matching (weight: 30%)
  if (isGenderCompatible(user1, user2)) {
    score += 0.3;
  }
  factors++;

  // Time zone compatibility (weight: 20%)
  const timezoneScore = calculateTimezoneCompatibility(user1.timezone, user2.timezone);
  score += timezoneScore * 0.2;
  factors++;

  // Sleep schedule alignment (weight: 25%)
  const scheduleScore = calculateScheduleCompatibility(
    user1.sleepTime, user1.wakeTime,
    user2.sleepTime, user2.wakeTime
  );
  score += scheduleScore * 0.25;
  factors++;

  // Voice preferences compatibility (weight: 15%)
  if (user1.voicePreferences && user2.voicePreferences) {
    const voiceScore = calculateVoiceCompatibility(user1.voicePreferences, user2.voicePreferences);
    score += voiceScore * 0.15;
    factors++;
  }

  // Activity pattern similarity (weight: 10%)
  const activityScore = calculateActivityCompatibility(user1.lastActivity, user2.lastActivity);
  score += activityScore * 0.1;
  factors++;

  return Math.min(score, 1); // Cap at 1.0
}

/**
 * Check if users are gender-compatible based on preferences
 */
function isGenderCompatible(user1, user2) {
  // If either user prefers "any", they're compatible
  if (user1.matchPreference === 'any' || user2.matchPreference === 'any') {
    return true;
  }

  // Check if each user's gender matches the other's preference
  const user1WantsUser2 = user1.matchPreference === user2.genderIdentity || 
                         user1.matchPreference === 'any';
  const user2WantsUser1 = user2.matchPreference === user1.genderIdentity || 
                         user2.matchPreference === 'any';

  return user1WantsUser2 && user2WantsUser1;
}

/**
 * Calculate timezone compatibility (0-1 score)
 */
function calculateTimezoneCompatibility(tz1, tz2) {
  if (!tz1 || !tz2) return 0.5; // neutral if missing data

  // Simple timezone difference calculation
  // In production, you'd use a proper timezone library
  const timezones = {
    'UTC': 0, 'GMT': 0,
    'EST': -5, 'PST': -8, 'CST': -6, 'MST': -7,
    'Europe/London': 0, 'Europe/Paris': 1, 'Europe/Berlin': 1,
    'America/New_York': -5, 'America/Los_Angeles': -8,
    'Asia/Tokyo': 9, 'Asia/Shanghai': 8
  };

  const offset1 = timezones[tz1] || 0;
  const offset2 = timezones[tz2] || 0;
  const diff = Math.abs(offset1 - offset2);

  // Perfect match (same timezone) = 1.0
  // 1-3 hour difference = 0.8
  // 4-6 hour difference = 0.6
  // 7-9 hour difference = 0.4
  // 10+ hour difference = 0.2
  if (diff === 0) return 1.0;
  if (diff <= 3) return 0.8;
  if (diff <= 6) return 0.6;
  if (diff <= 9) return 0.4;
  return 0.2;
}

/**
 * Calculate sleep schedule compatibility (0-1 score)
 */
function calculateScheduleCompatibility(sleep1, wake1, sleep2, wake2) {
  if (!sleep1 || !wake1 || !sleep2 || !wake2) return 0.5;

  const time1Sleep = timeToMinutes(sleep1);
  const time1Wake = timeToMinutes(wake1);
  const time2Sleep = timeToMinutes(sleep2);
  const time2Wake = timeToMinutes(wake2);

  // Calculate overlap in sleep periods
  const overlap = calculateTimeOverlap(
    time1Sleep, time1Wake,
    time2Sleep, time2Wake
  );

  // More overlap = higher compatibility
  const maxPossibleOverlap = 12 * 60; // 12 hours
  return Math.min(overlap / maxPossibleOverlap, 1.0);
}

/**
 * Calculate voice preference compatibility
 */
function calculateVoiceCompatibility(voice1, voice2) {
  if (!voice1 || !voice2) return 0.5;

  let score = 0;
  let factors = 0;

  // Compare voice preferences
  const preferences = ['pitch', 'accent', 'pace', 'volume'];
  
  preferences.forEach(pref => {
    if (voice1[pref] && voice2[pref]) {
      // If both have same preference, high score
      if (voice1[pref] === voice2[pref]) {
        score += 1;
      } else if (isCompatiblePreference(voice1[pref], voice2[pref])) {
        score += 0.7;
      } else {
        score += 0.3;
      }
      factors++;
    }
  });

  return factors > 0 ? score / factors : 0.5;
}

/**
 * Calculate activity pattern compatibility based on recent activity
 */
function calculateActivityCompatibility(lastActivity1, lastActivity2) {
  if (!lastActivity1 || !lastActivity2) return 0.5;

  const now = Date.now();
  const activity1Age = now - new Date(lastActivity1).getTime();
  const activity2Age = now - new Date(lastActivity2).getTime();

  // Both recently active = high score
  const hour = 60 * 60 * 1000;
  if (activity1Age < hour && activity2Age < hour) return 1.0;
  if (activity1Age < 6 * hour && activity2Age < 6 * hour) return 0.8;
  if (activity1Age < 24 * hour && activity2Age < 24 * hour) return 0.6;
  return 0.3;
}

/**
 * Find best matches for a user using advanced algorithm
 * @param {string} userId - User ID to find matches for
 * @param {number} limit - Maximum number of matches to return
 * @returns {Array} Array of potential matches with compatibility scores
 */
async function findAdvancedMatches(userId, limit = 10) {
  try {
    // Get the requesting user's data
    const requestingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userType: true,
        genderIdentity: true,
        matchPreference: true,
        timezone: true,
        sleepTime: true,
        wakeTime: true,
        voicePreferences: true,
        lastActivity: true,
        preferredTimeSlots: true,
        availabilityStatus: true
      }
    });

    if (!requestingUser) {
      throw new Error('User not found');
    }

    // Get potential matches (exclude self and blocked users)
    const potentialMatches = await prisma.user.findMany({
      where: {
        id: { not: userId },
        connectionState: 'idle',
        availabilityStatus: 'available',
        userType: { not: 'anonymous' }, // For advanced matching, focus on profile users
        isVerified: true,
        lastActivity: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Active within 7 days
        }
      },
      select: {
        id: true,
        displayName: true,
        userType: true,
        genderIdentity: true,
        matchPreference: true,
        timezone: true,
        sleepTime: true,
        wakeTime: true,
        voicePreferences: true,
        lastActivity: true,
        preferredTimeSlots: true,
        matchingScore: true
      },
      take: limit * 3 // Get more candidates to filter
    });

    // Calculate compatibility scores and rank matches
    const scoredMatches = potentialMatches
      .filter(match => isGenderCompatible(requestingUser, match))
      .map(match => {
        const compatibilityScore = calculateCompatibilityScore(requestingUser, match);
        return {
          ...match,
          compatibilityScore,
          matchingAlgorithm: 'advanced_v1'
        };
      })
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, limit);

    // Log the matching attempt for analytics
    await prisma.userBehaviorEvent.create({
      data: {
        userId,
        eventType: 'advanced_matching',
        eventCategory: 'matching',
        eventData: {
          candidatesFound: potentialMatches.length,
          matchesReturned: scoredMatches.length,
          algorithm: 'advanced_v1',
          topScore: scoredMatches[0]?.compatibilityScore || 0
        }
      }
    });

    return scoredMatches;
  } catch (error) {
    console.error('Advanced matching error:', error);
    throw error;
  }
}

/**
 * Find mutual favorites who are currently available
 * @param {string} userId - User ID
 * @returns {Array} Available mutual favorites
 */
async function findAvailableFavorites(userId) {
  try {
    const mutualFavorites = await prisma.userFavorite.findMany({
      where: {
        userId,
        isMutual: true
      },
      include: {
        favorite: {
          select: {
            id: true,
            displayName: true,
            connectionState: true,
            availabilityStatus: true,
            lastActivity: true
          }
        }
      }
    });

    // Filter for available favorites
    const availableFavorites = mutualFavorites
      .filter(fav => 
        fav.favorite.connectionState === 'idle' &&
        fav.favorite.availabilityStatus === 'available'
      )
      .map(fav => ({
        ...fav.favorite,
        compatibilityScore: 0.95, // High score for mutual favorites
        matchingAlgorithm: 'favorites',
        sessionSource: 'favorite'
      }));

    return availableFavorites;
  } catch (error) {
    console.error('Find available favorites error:', error);
    return [];
  }
}

/**
 * Update user's matching score based on recent interactions
 * @param {string} userId - User ID to update
 */
async function updateUserMatchingScore(userId) {
  try {
    const recentCalls = await prisma.callHistory.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
      take: 10,
      select: {
        userRating: true,
        compatibilityScore: true,
        duration: true
      }
    });

    if (recentCalls.length === 0) return;

    // Calculate average performance
    const avgRating = recentCalls
      .filter(call => call.userRating)
      .reduce((sum, call) => sum + call.userRating, 0) / 
      recentCalls.filter(call => call.userRating).length || 0;

    const avgCompatibility = recentCalls
      .filter(call => call.compatibilityScore)
      .reduce((sum, call) => sum + call.compatibilityScore, 0) / 
      recentCalls.filter(call => call.compatibilityScore).length || 0;

    const avgDuration = recentCalls
      .reduce((sum, call) => sum + (call.duration || 0), 0) / recentCalls.length;

    // Calculate overall matching score (0-1)
    let matchingScore = 0;
    if (avgRating > 0) matchingScore += (avgRating / 5) * 0.4; // 40% weight
    if (avgCompatibility > 0) matchingScore += avgCompatibility * 0.4; // 40% weight
    if (avgDuration > 0) matchingScore += Math.min(avgDuration / 1800, 1) * 0.2; // 20% weight (30 min target)

    await prisma.user.update({
      where: { id: userId },
      data: { matchingScore }
    });

    return matchingScore;
  } catch (error) {
    console.error('Update matching score error:', error);
  }
}

// Utility functions
function timeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

function calculateTimeOverlap(start1, end1, start2, end2) {
  // Handle overnight periods
  if (end1 < start1) end1 += 24 * 60;
  if (end2 < start2) end2 += 24 * 60;

  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);
  
  return Math.max(0, overlapEnd - overlapStart);
}

function isCompatiblePreference(pref1, pref2) {
  const compatiblePairs = {
    'low': ['medium'],
    'medium': ['low', 'high'],
    'high': ['medium'],
    'slow': ['medium'],
    'fast': ['medium']
  };

  return compatiblePairs[pref1]?.includes(pref2) || false;
}

module.exports = {
  calculateCompatibilityScore,
  findAdvancedMatches,
  findAvailableFavorites,
  updateUserMatchingScore,
  isGenderCompatible
}; 