/**
 * User Selectors - Centralized user database operations
 * Eliminates duplication of user queries across route files
 */
const prisma = require('./prisma');

/**
 * Standard user selection fields for public API responses
 */
const PUBLIC_USER_FIELDS = {
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
};

/**
 * Extended user fields including authentication data
 */
const AUTH_USER_FIELDS = {
  ...PUBLIC_USER_FIELDS,
  password: true
};

/**
 * Minimal user fields for basic operations
 */
const BASIC_USER_FIELDS = {
  id: true,
  email: true,
  username: true,
  name: true,
  userType: true,
  displayName: true,
  isVerified: true
};

/**
 * Find user by ID with public fields
 */
async function findUserById(userId) {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: PUBLIC_USER_FIELDS
  });
}

/**
 * Find user by email with auth fields (for login)
 */
async function findUserByEmailWithAuth(email) {
  return await prisma.user.findUnique({
    where: { email },
    select: AUTH_USER_FIELDS
  });
}

/**
 * Find user by email or username (for registration check)
 */
async function findUserByEmailOrUsername(email, username) {
  return await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { username: username || null }
      ]
    },
    select: BASIC_USER_FIELDS
  });
}

/**
 * Find user by username
 */
async function findUserByUsername(username) {
  return await prisma.user.findUnique({
    where: { username },
    select: BASIC_USER_FIELDS
  });
}

/**
 * Create new user with standard fields
 */
async function createUser(userData) {
  return await prisma.user.create({
    data: userData,
    select: PUBLIC_USER_FIELDS
  });
}

/**
 * Update user by ID
 */
async function updateUserById(userId, updateData) {
  return await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: PUBLIC_USER_FIELDS
  });
}

/**
 * Check if user exists by email
 */
async function userExistsByEmail(email) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });
  return !!user;
}

/**
 * Check if user exists by username
 */
async function userExistsByUsername(username) {
  if (!username) return false;
  
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true }
  });
  return !!user;
}

/**
 * Get user with analytics
 */
async function findUserWithAnalytics(userId) {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...PUBLIC_USER_FIELDS,
      analytics: true
    }
  });
}

/**
 * Validate user ownership (user can only access their own data)
 */
function validateUserOwnership(requestUserId, targetUserId) {
  if (requestUserId !== targetUserId) {
    throw new Error('Access denied: You can only access your own data');
  }
}

module.exports = {
  // Field constants
  PUBLIC_USER_FIELDS,
  AUTH_USER_FIELDS,
  BASIC_USER_FIELDS,
  
  // Find operations
  findUserById,
  findUserByEmailWithAuth,
  findUserByEmailOrUsername,
  findUserByUsername,
  findUserWithAnalytics,
  
  // Create/Update operations
  createUser,
  updateUserById,
  
  // Existence checks
  userExistsByEmail,
  userExistsByUsername,
  
  // Validation helpers
  validateUserOwnership
}; 