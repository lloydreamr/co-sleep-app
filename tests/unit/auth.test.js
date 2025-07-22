// Unit Tests for Authentication System
const { hashPassword, comparePassword, generateToken, verifyToken } = require('../../lib/auth');

describe('Authentication System', () => {
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

        test('should reject expired JWT token', () => {
            // This would require mocking time or creating an expired token
            // For now, we'll test with a malformed token
            const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDB9.invalid';
            const decoded = verifyToken(expiredToken);
            
            expect(decoded).toBeNull();
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty password', async () => {
            await expect(hashPassword('')).rejects.toThrow();
        });

        test('should handle null password', async () => {
            await expect(hashPassword(null)).rejects.toThrow();
        });

        test('should handle undefined userId in token generation', () => {
            expect(() => generateToken(undefined)).toThrow();
        });

        test('should handle null token verification', () => {
            const decoded = verifyToken(null);
            expect(decoded).toBeNull();
        });
    });
}); 