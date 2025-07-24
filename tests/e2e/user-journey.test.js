// End-to-End Tests for Complete User Journey
const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('../../routes/auth');
const onboardingRoutes = require('../../routes/onboarding');
// Premium routes removed in Phase 1 - freemium app

describe('Complete User Journey', () => {
    let app;
    let prisma;

    beforeAll(async () => {
        // Setup Express app for testing
        app = express();
        app.use(express.json());
        app.use('/api/auth', authRoutes);
        app.use('/api/onboarding', onboardingRoutes);
        // Premium routes removed in Phase 1 - freemium app

        // Initialize Prisma
        prisma = new PrismaClient();
        await prisma.$connect();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe('Anonymous User Journey', () => {
        let userId;

        test('1. User can start onboarding anonymously', async () => {
            const response = await request(app)
                .post('/api/onboarding/start')
                .send({
                    userType: 'anonymous'
                })
                .expect(200);

            expect(response.body.user).toBeDefined();
            expect(response.body.user.userType).toBe('anonymous');
            expect(response.body.user.id).toBeDefined();
            expect(response.body.message).toBe('Onboarding started successfully');

            userId = response.body.user.id;
        });

        test('2. User can complete consent step', async () => {
            const response = await request(app)
                .post('/api/onboarding/consent')
                .send({
                    userId: userId
                })
                .expect(200);

            expect(response.body.user).toBeDefined();
            expect(response.body.user.consentGiven).toBe(true);
            expect(response.body.message).toBe('Consent recorded successfully');
        });

        test('3. Anonymous user cannot access premium features', async () => {
            // Anonymous users don't have auth tokens, so they can't access premium endpoints
            const response = await request(app)
                .get('/api/premium/status')
                .expect(401);

            expect(response.body.error).toBe('No token provided');
        });
    });

    describe('Profile User Journey', () => {
        let userId;
        let authToken;
        let userData;

        test('1. User can start onboarding with profile', async () => {
            const response = await request(app)
                .post('/api/onboarding/start')
                .send({
                    userType: 'profile'
                })
                .expect(200);

            expect(response.body.user).toBeDefined();
            expect(response.body.user.userType).toBe('profile');
            expect(response.body.user.id).toBeDefined();

            userId = response.body.user.id;
        });

        test('2. User can complete profile setup', async () => {
            userData = {
                userId: userId,
                displayName: 'Journey Test User',
                genderIdentity: 'nonbinary',
                matchPreference: 'any'
            };

            const response = await request(app)
                .post('/api/onboarding/profile')
                .send(userData)
                .expect(200);

            expect(response.body.user).toBeDefined();
            expect(response.body.user.displayName).toBe(userData.displayName);
            expect(response.body.user.genderIdentity).toBe(userData.genderIdentity);
            expect(response.body.user.matchPreference).toBe(userData.matchPreference);
        });

        test('3. User can complete consent step', async () => {
            const response = await request(app)
                .post('/api/onboarding/consent')
                .send({
                    userId: userId
                })
                .expect(200);

            expect(response.body.user.consentGiven).toBe(true);
        });

        test('4. User can register for full account', async () => {
            const registerData = {
                email: 'journey@example.com',
                username: 'journeyuser',
                name: 'Journey Test User',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(registerData)
                .expect(200);

            expect(response.body.user).toBeDefined();
            expect(response.body.user.email).toBe(registerData.email);
            expect(response.body.token).toBeDefined();

            authToken = response.body.token;
        });

        test('5. User can check premium status', async () => {
            const response = await request(app)
                .get('/api/premium/status')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.isPremium).toBe(false);
            expect(response.body.premiumUntil).toBeNull();
            expect(response.body.success).toBe(true);
        });

        test('6. User can view premium plans', async () => {
            const response = await request(app)
                .get('/api/premium/plans')
                .expect(200);

            expect(response.body.plans).toBeDefined();
            expect(response.body.plans.premium).toBeDefined();
            expect(response.body.plans.pro).toBeDefined();

            const premiumPlan = response.body.plans.premium;
            expect(premiumPlan.price).toBe(999);
            expect(premiumPlan.features).toContain('Priority matching');
            expect(premiumPlan.features).toContain('Background sounds');
        });

        test('7. User attempts premium upgrade (expects Stripe not configured)', async () => {
            const response = await request(app)
                .post('/api/premium/create-checkout-session')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ plan: 'premium' })
                .expect(500);

            expect(response.body.error).toBe('Stripe not configured');
        });

        test('8. User can access their profile', async () => {
            const response = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.user).toBeDefined();
            expect(response.body.user.email).toBe('journey@example.com');
            expect(response.body.user.username).toBe('journeyuser');
        });
    });

    describe('Premium User Journey', () => {
        let userId;
        let authToken;

        beforeEach(async () => {
            // Create and authenticate a user
            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'premiumjourney@example.com',
                    username: 'premiumjourney',
                    name: 'Premium Journey',
                    password: 'password123'
                });

            authToken = registerResponse.body.token;
            userId = registerResponse.body.user.id;

            // Manually set as premium user
            await prisma.user.update({
                where: { id: userId },
                data: {
                    isPremium: true,
                    premiumUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    stripeCustomerId: 'cus_test_premium',
                    stripeSubscriptionId: 'sub_test_premium'
                }
            });
        });

        test('1. Premium user can check status', async () => {
            const response = await request(app)
                .get('/api/premium/status')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.isPremium).toBe(true);
            expect(response.body.premiumUntil).toBeDefined();
            expect(new Date(response.body.premiumUntil) > new Date()).toBe(true);
        });

        test('2. Premium user can attempt to cancel (expects Stripe not configured)', async () => {
            const response = await request(app)
                .post('/api/premium/cancel')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(500);

            expect(response.body.error).toBe('Stripe not configured');
        });
    });

    describe('Data Consistency Journey', () => {
        test('User data remains consistent throughout journey', async () => {
            // Start onboarding
            const onboardingResponse = await request(app)
                .post('/api/onboarding/start')
                .send({ userType: 'profile' })
                .expect(200);

            const userId = onboardingResponse.body.user.id;

            // Complete profile
            await request(app)
                .post('/api/onboarding/profile')
                .send({
                    userId: userId,
                    displayName: 'Consistency Test',
                    genderIdentity: 'female',
                    matchPreference: 'female'
                })
                .expect(200);

            // Complete consent
            await request(app)
                .post('/api/onboarding/consent')
                .send({ userId: userId })
                .expect(200);

            // Register account
            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'consistency@example.com',
                    username: 'consistency',
                    name: 'Consistency Test',
                    password: 'password123'
                })
                .expect(200);

            const authToken = registerResponse.body.token;
            const registeredUserId = registerResponse.body.user.id;

            // Verify profile data persists
            const profileResponse = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            const user = profileResponse.body.user;
            expect(user.email).toBe('consistency@example.com');
            expect(user.username).toBe('consistency');
            expect(user.name).toBe('Consistency Test');

            // Verify user can access premium endpoints
            const premiumResponse = await request(app)
                .get('/api/premium/status')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(premiumResponse.body.success).toBe(true);
            expect(premiumResponse.body.isPremium).toBe(false);
        });
    });
}); 