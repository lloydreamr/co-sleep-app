// Test Setup - Runs before all tests
const path = require('path');

// Set test environment variables
process.env.NODE_ENV = 'test';
// Use a test PostgreSQL database URL compatible with the schema
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/test_cosleep?sslmode=disable';
process.env.JWT_SECRET = 'test-jwt-secret-for-hence-testing';
process.env.PORT = '3001';
process.env.HOST = 'localhost';
process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_placeholder';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_placeholder';

// Set longer timeout for tests
jest.setTimeout(30000);

// Mock console.log for cleaner test output
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Global test helpers
global.testHelpers = {
    // Generate test user data
    generateTestUser: (overrides = {}) => ({
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
        userType: 'profile',
        displayName: 'Test User',
        genderIdentity: 'prefer_not_to_say',
        matchPreference: 'any',
        consentGiven: true,
        ...overrides
    }),

    // Generate test session data
    generateTestSession: (overrides = {}) => ({
        userId: 'test-user-id',
        partnerId: 'test-partner-id',
        startTime: new Date(),
        quality: 4,
        notes: 'Test session',
        ...overrides
    }),

    // Wait helper for async operations
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    // Clean database helper
    cleanDatabase: async () => {
        try {
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            
            // Clean all tables in reverse dependency order
            await prisma.sleepAnalytics.deleteMany();
            await prisma.sleepSession.deleteMany();
            await prisma.user.deleteMany();
            
            await prisma.$disconnect();
        } catch (error) {
            console.error('Database cleanup error:', error);
        }
    }
};

// Setup test database before all tests - Skip database setup for now since we don't have a test DB
beforeAll(async () => {
    console.log('🧪 Setting up test environment...');
    console.log('⚠️  Skipping database connection for tests - tests will run without database');
});

// Cleanup after all tests
afterAll(async () => {
    console.log('🧹 Cleaning up test environment...');
    // Skip database cleanup since we're not connecting to a real database
});

// Reset database between tests - Skip for now
beforeEach(async () => {
    // Skip database cleanup since we're not connecting to a real database
}); 