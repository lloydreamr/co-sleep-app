// Integration Tests for Authentication Routes
const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('../../routes/auth');

describe('Authentication Routes', () => {
    let app;
    let prisma;

    beforeAll(async () => {
        // Setup Express app for testing
        app = express();
        app.use(express.json());
        app.use('/api/auth', authRoutes);

        // Initialize Prisma
        prisma = new PrismaClient();
        await prisma.$connect();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe('POST /api/auth/register', () => {
        test('should register new user successfully', async () => {
            const userData = {
                email: 'newuser@example.com',
                username: 'newuser',
                name: 'New User',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(200);

            expect(response.body.user).toBeDefined();
            expect(response.body.user.email).toBe(userData.email);
            expect(response.body.user.username).toBe(userData.username);
            expect(response.body.user.password).toBeUndefined(); // Password should not be returned
            expect(response.body.token).toBeDefined();
            expect(response.body.message).toBe('User registered successfully');
        });

        test('should reject registration with missing email', async () => {
            const userData = {
                username: 'testuser',
                name: 'Test User',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.error).toBe('Email and password are required');
        });

        test('should reject registration with short password', async () => {
            const userData = {
                email: 'test@example.com',
                username: 'testuser',
                name: 'Test User',
                password: '123'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.error).toBe('Password must be at least 6 characters');
        });

        test('should reject duplicate email registration', async () => {
            const userData = {
                email: 'duplicate@example.com',
                username: 'user1',
                name: 'User One',
                password: 'password123'
            };

            // First registration
            await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(200);

            // Attempt duplicate registration
            const duplicateData = {
                ...userData,
                username: 'user2',
                name: 'User Two'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(duplicateData)
                .expect(400);

            expect(response.body.error).toBe('User already exists');
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            // Create a test user for login tests
            await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'logintest@example.com',
                    username: 'logintest',
                    name: 'Login Test',
                    password: 'password123'
                });
        });

        test('should login with valid credentials', async () => {
            const loginData = {
                email: 'logintest@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(200);

            expect(response.body.user).toBeDefined();
            expect(response.body.user.email).toBe(loginData.email);
            expect(response.body.user.password).toBeUndefined();
            expect(response.body.token).toBeDefined();
            expect(response.body.message).toBe('Login successful');
        });

        test('should reject login with invalid email', async () => {
            const loginData = {
                email: 'nonexistent@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(401);

            expect(response.body.error).toBe('Invalid credentials');
        });

        test('should reject login with invalid password', async () => {
            const loginData = {
                email: 'logintest@example.com',
                password: 'wrongpassword'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(401);

            expect(response.body.error).toBe('Invalid credentials');
        });

        test('should reject login with missing credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({})
                .expect(400);

            expect(response.body.error).toBe('Email and password are required');
        });
    });

    describe('GET /api/auth/profile', () => {
        let authToken;
        let userId;

        beforeEach(async () => {
            // Register and login to get auth token
            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'profiletest@example.com',
                    username: 'profiletest',
                    name: 'Profile Test',
                    password: 'password123'
                });

            authToken = registerResponse.body.token;
            userId = registerResponse.body.user.id;
        });

        test('should get user profile with valid token', async () => {
            const response = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.user).toBeDefined();
            expect(response.body.user.id).toBe(userId);
            expect(response.body.user.email).toBe('profiletest@example.com');
            expect(response.body.user.password).toBeUndefined();
        });

        test('should reject request without token', async () => {
            const response = await request(app)
                .get('/api/auth/profile')
                .expect(401);

            expect(response.body.error).toBe('No token provided');
        });

        test('should reject request with invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', 'Bearer invalid.token.here')
                .expect(401);

            expect(response.body.error).toBe('Invalid token');
        });
    });
}); 