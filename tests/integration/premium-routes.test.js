// Integration Tests for Premium Routes
const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('../../routes/auth');
const premiumRoutes = require('../../routes/premium');

describe('Premium Routes', () => {
    let app;
    let prisma;
    let authToken;
    let userId;

    beforeAll(async () => {
        // Setup Express app for testing
        app = express();
        app.use(express.json());
        app.use('/api/auth', authRoutes);
        app.use('/api/premium', premiumRoutes);

        // Initialize Prisma
        prisma = new PrismaClient();
        await prisma.$connect();
    });

    beforeEach(async () => {
        // Create and authenticate a test user for each test
        const registerResponse = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'premiumtest@example.com',
                username: 'premiumtest',
                name: 'Premium Test',
                password: 'password123'
            });

        authToken = registerResponse.body.token;
        userId = registerResponse.body.user.id;
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe('GET /api/premium/plans', () => {
        test('should return available subscription plans', async () => {
            const response = await request(app)
                .get('/api/premium/plans')
                .expect(200);

            expect(response.body.plans).toBeDefined();
            expect(response.body.plans.premium).toBeDefined();
            expect(response.body.plans.pro).toBeDefined();
            expect(response.body.success).toBe(true);

            // Check premium plan structure
            const premiumPlan = response.body.plans.premium;
            expect(premiumPlan.name).toBe('Premium');
            expect(premiumPlan.price).toBe(999);
            expect(premiumPlan.currency).toBe('usd');
            expect(premiumPlan.interval).toBe('month');
            expect(premiumPlan.features).toBeInstanceOf(Array);

            // Check pro plan structure
            const proPlan = response.body.plans.pro;
            expect(proPlan.name).toBe('Pro');
            expect(proPlan.price).toBe(1999);
            expect(proPlan.currency).toBe('usd');
            expect(proPlan.interval).toBe('month');
            expect(proPlan.features).toBeInstanceOf(Array);
        });
    });

    describe('GET /api/premium/status', () => {
        test('should return premium status for authenticated user', async () => {
            const response = await request(app)
                .get('/api/premium/status')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.isPremium).toBeDefined();
            expect(response.body.premiumUntil).toBeDefined();
            expect(response.body.subscription).toBeDefined();
            expect(response.body.success).toBe(true);

            // New user should not be premium
            expect(response.body.isPremium).toBe(false);
            expect(response.body.premiumUntil).toBeNull();
            expect(response.body.subscription).toBeNull();
        });

        test('should reject request without authentication', async () => {
            const response = await request(app)
                .get('/api/premium/status')
                .expect(401);

            expect(response.body.error).toBe('No token provided');
        });

        test('should reject request with invalid token', async () => {
            const response = await request(app)
                .get('/api/premium/status')
                .set('Authorization', 'Bearer invalid.token.here')
                .expect(401);

            expect(response.body.error).toBe('Invalid token');
        });
    });

    describe('POST /api/premium/create-checkout-session', () => {
        test('should handle missing Stripe configuration gracefully', async () => {
            const response = await request(app)
                .post('/api/premium/create-checkout-session')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ plan: 'premium' })
                .expect(500);

            expect(response.body.error).toBe('Stripe not configured');
        });

        test('should reject invalid plan selection', async () => {
            const response = await request(app)
                .post('/api/premium/create-checkout-session')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ plan: 'invalid' })
                .expect(400);

            expect(response.body.error).toBe('Invalid plan selected');
        });

        test('should reject request without authentication', async () => {
            const response = await request(app)
                .post('/api/premium/create-checkout-session')
                .send({ plan: 'premium' })
                .expect(401);

            expect(response.body.error).toBe('No token provided');
        });

        test('should reject request without plan', async () => {
            const response = await request(app)
                .post('/api/premium/create-checkout-session')
                .set('Authorization', `Bearer ${authToken}`)
                .send({})
                .expect(400);

            expect(response.body.error).toBe('Invalid plan selected');
        });
    });

    describe('POST /api/premium/cancel', () => {
        test('should handle missing Stripe configuration gracefully', async () => {
            const response = await request(app)
                .post('/api/premium/cancel')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(500);

            expect(response.body.error).toBe('Stripe not configured');
        });

        test('should reject request without authentication', async () => {
            const response = await request(app)
                .post('/api/premium/cancel')
                .expect(401);

            expect(response.body.error).toBe('No token provided');
        });
    });

    describe('Premium User Scenarios', () => {
        beforeEach(async () => {
            // Manually set user as premium for testing
            await prisma.user.update({
                where: { id: userId },
                data: {
                    isPremium: true,
                    premiumUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                    stripeCustomerId: 'cus_test_customer',
                    stripeSubscriptionId: 'sub_test_subscription'
                }
            });
        });

        test('should return premium status for premium user', async () => {
            const response = await request(app)
                .get('/api/premium/status')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.isPremium).toBe(true);
            expect(response.body.premiumUntil).toBeDefined();
            expect(new Date(response.body.premiumUntil)).toBeInstanceOf(Date);
        });
    });

    describe('Premium Feature Gating', () => {
        test('should allow access to premium status for all users', async () => {
            // Even non-premium users should be able to check their status
            const response = await request(app)
                .get('/api/premium/status')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });
}); 