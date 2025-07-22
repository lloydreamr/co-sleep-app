// Test Configuration
module.exports = {
    // Test environment variables
    env: {
        NODE_ENV: 'test',
        DATABASE_URL: 'file:./test.db',
        JWT_SECRET: 'test-jwt-secret-for-hence-testing',
        PORT: 3001,
        HOST: 'localhost',
        STRIPE_SECRET_KEY: 'sk_test_placeholder',
        STRIPE_PUBLISHABLE_KEY: 'pk_test_placeholder',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_placeholder'
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