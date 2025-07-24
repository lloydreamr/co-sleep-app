// Test Configuration
module.exports = {
    // Test environment variables
    env: {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://test:test@localhost:5433/test_cosleep?sslmode=disable',
        JWT_SECRET: 'test-jwt-secret-for-hence-testing',
        PORT: 3001,
        HOST: 'localhost',
        // Note: Stripe variables removed - freemium app
    },
    
    // Jest configuration
    jest: {
        testEnvironment: 'node',
        setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
        testMatch: ['<rootDir>/tests/**/*.test.js'],
        collectCoverageFrom: [
            'routes/**/*.js',
            'lib/**/*.js',
            'services/**/*.js',
            '!**/node_modules/**'
        ],
        coverageDirectory: 'coverage',
        verbose: true
    }
}; 