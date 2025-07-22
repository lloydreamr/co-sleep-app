// Standalone Unit Tests for Authentication Functions
// This test file doesn't use the global setup to avoid database issues

// Set test environment variables locally
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-hence-testing';

const { hashPassword, comparePassword, generateToken, verifyToken } = require('../../lib/auth');

describe('Authentication Functions (Standalone)', () => {
    describe('Password Hashing', () => {
        test('should hash password correctly', async () => {
            const password = 'testpassword123';
            const hashedPassword = await hashPassword(password);
            
            expect(hashedPassword).toBeDefined();
            expect(hashedPassword).not.toBe(password);
            expect(hashedPassword.length).toBeGreaterThan(50);
        });

        test('should generate different hashes for same password', async () => {
            const password = 'testpassword123';
            const hash1 = await hashPassword(password);
            const hash2 = await hashPassword(password);
            
            expect(hash1).not.toBe(hash2);
        });

        test('should verify correct password', async () => {
            const password = 'testpassword123';
            const hashedPassword = await hashPassword(password);
            const isValid = await comparePassword(password, hashedPassword);
            
            expect(isValid).toBe(true);
        });

        test('should reject incorrect password', async () => {
            const password = 'testpassword123';
            const wrongPassword = 'wrongpassword';
            const hashedPassword = await hashPassword(password);
            const isValid = await comparePassword(wrongPassword, hashedPassword);
            
            expect(isValid).toBe(false);
        });
    });

    describe('JWT Token Management', () => {
        test('should generate valid JWT token', () => {
            const userId = 'test-user-id-123';
            const token = generateToken(userId);
            
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
        });

        test('should verify valid JWT token', () => {
            const userId = 'test-user-id-123';
            const token = generateToken(userId);
            const decoded = verifyToken(token);
            
            expect(decoded).toBeDefined();
            expect(decoded.userId).toBe(userId);
            expect(decoded.iat).toBeDefined();
            expect(decoded.exp).toBeDefined();
        });

        test('should reject invalid JWT token', () => {
            const invalidToken = 'invalid.jwt.token';
            const decoded = verifyToken(invalidToken);
            
            expect(decoded).toBeNull();
        });

        test('should reject malformed JWT token', () => {
            const malformedToken = 'not.a.valid.jwt.token.at.all';
            const decoded = verifyToken(malformedToken);
            
            expect(decoded).toBeNull();
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty password', async () => {
            // Empty password should be hashed, not rejected
            const hash = await hashPassword('');
            expect(hash).toMatch(/^\$2[ayb]\$\d+\$/);
            expect(hash.length).toBeGreaterThan(20);
        });

        test('should handle null password', async () => {
            await expect(hashPassword(null)).rejects.toThrow();
        });

        test('should handle undefined userId in token generation', () => {
            // undefined userId should create a token with undefined userId, not throw
            const token = generateToken(undefined);
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            
            // Verify the token contains undefined userId
            const decoded = verifyToken(token);
            expect(decoded.userId).toBeUndefined();
        });

        test('should handle null token verification', () => {
            const decoded = verifyToken(null);
            expect(decoded).toBeNull();
        });

        test('should handle empty string token verification', () => {
            const decoded = verifyToken('');
            expect(decoded).toBeNull();
        });
    });

    describe('Password Security', () => {
        test('should use bcrypt hashing with salt', async () => {
            const password = 'testpassword';
            const hash = await hashPassword(password);
            
            // bcrypt hashes start with $2b$ and have specific structure
            expect(hash).toMatch(/^\$2[aby]\$\d+\$/);
        });

        test('should handle long passwords', async () => {
            const longPassword = 'a'.repeat(1000);
            const hash = await hashPassword(longPassword);
            const isValid = await comparePassword(longPassword, hash);
            
            expect(isValid).toBe(true);
        });

        test('should handle special characters in passwords', async () => {
            const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';
            const hash = await hashPassword(specialPassword);
            const isValid = await comparePassword(specialPassword, hash);
            
            expect(isValid).toBe(true);
        });
    });

    describe('JWT Security', () => {
        test('should generate tokens with expiration', () => {
            const userId = 'test-user';
            const token = generateToken(userId);
            const decoded = verifyToken(token);
            
            expect(decoded.exp).toBeDefined();
            expect(decoded.exp).toBeGreaterThan(Date.now() / 1000); // Should expire in future
        });

        test('should include issued at timestamp', () => {
            const userId = 'test-user';
            const token = generateToken(userId);
            const decoded = verifyToken(token);
            
            expect(decoded.iat).toBeDefined();
            expect(decoded.iat).toBeLessThanOrEqual(Date.now() / 1000); // Should be issued now or in past
        });
    });
}); 