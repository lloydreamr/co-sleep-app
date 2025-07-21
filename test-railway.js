#!/usr/bin/env node

const RAILWAY_URL = 'https://co-sleep-app-production.up.railway.app';

async function testRegistration() {
    try {
        console.log('🧪 Testing Railway Registration...');
        
        const response = await fetch(`${RAILWAY_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: `test-${Date.now()}@example.com`,
                name: 'Test User',
                password: 'password123'
            })
        });
        
        const result = await response.text();
        
        console.log(`Status: ${response.status}`);
        console.log(`Response: ${result.substring(0, 200)}${result.length > 200 ? '...' : ''}`);
        
        if (response.status === 200) {
            console.log('✅ Registration is working!');
        } else if (response.status === 500) {
            console.log('❌ Still getting 500 error - database schema needs updating');
        } else {
            console.log(`⚠️ Unexpected status: ${response.status}`);
        }
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }
}

testRegistration(); 