#!/usr/bin/env node

// Using built-in fetch (Node.js 18+)

const RAILWAY_URL = 'https://co-sleep-app-production.up.railway.app';
const LOCAL_URL = 'http://localhost:3000';

async function testEndpoint(url, endpoint, data = null) {
    try {
        const options = {
            method: data ? 'POST' : 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        console.log(`Testing ${url}${endpoint}...`);
        const response = await fetch(`${url}${endpoint}`, options);
        const result = await response.text();
        
        console.log(`Status: ${response.status}`);
        console.log(`Response: ${result.substring(0, 200)}${result.length > 200 ? '...' : ''}`);
        console.log('---');
        
        return { status: response.status, data: result };
    } catch (error) {
        console.log(`Error: ${error.message}`);
        console.log('---');
        return { status: 'ERROR', data: error.message };
    }
}

async function runTests() {
    console.log('🔍 Testing Co-Sleep App Authentication\n');
    
    // Test Railway endpoints
    console.log('🚂 RAILWAY TESTS:');
    await testEndpoint(RAILWAY_URL, '/health');
    await testEndpoint(RAILWAY_URL, '/api/auth/profile');
    await testEndpoint(RAILWAY_URL, '/api/auth/register', {
        email: 'test-railway@example.com',
        name: 'Test Railway User',
        password: 'password123'
    });
    
    console.log('\n🏠 LOCAL TESTS:');
    await testEndpoint(LOCAL_URL, '/health');
    await testEndpoint(LOCAL_URL, '/api/auth/profile');
    await testEndpoint(LOCAL_URL, '/api/auth/register', {
        email: 'test-local@example.com',
        name: 'Test Local User',
        password: 'password123'
    });
}

runTests().catch(console.error); 