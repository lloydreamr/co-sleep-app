#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🌙 Co-Sleep App Setup');
console.log('=====================\n');

// Check if .env exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

if (!fs.existsSync(envPath)) {
    console.log('📝 Creating .env file from template...');
    
    if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✅ .env file created!');
        console.log('⚠️  Please edit .env with your database credentials before continuing.\n');
    } else {
        console.log('❌ env.example not found. Creating basic .env file...');
        const basicEnv = `# Database
DATABASE_URL="postgresql://username:password@localhost:5432/cosleep_db"

# JWT Secret (change this in production!)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Server
PORT=3000
HOST=0.0.0.0

# Environment
NODE_ENV=development
`;
        fs.writeFileSync(envPath, basicEnv);
        console.log('✅ Basic .env file created!');
        console.log('⚠️  Please edit .env with your database credentials before continuing.\n');
    }
} else {
    console.log('✅ .env file already exists\n');
}

// Check if node_modules exists
if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
    console.log('📦 Installing dependencies...');
    try {
        execSync('npm install', { stdio: 'inherit' });
        console.log('✅ Dependencies installed!\n');
    } catch (error) {
        console.log('❌ Failed to install dependencies. Please run "npm install" manually.\n');
    }
} else {
    console.log('✅ Dependencies already installed\n');
}

// Check if Prisma client is generated
const prismaClientPath = path.join(__dirname, 'node_modules', '.prisma');
if (!fs.existsSync(prismaClientPath)) {
    console.log('🔧 Generating Prisma client...');
    try {
        execSync('npx prisma generate', { stdio: 'inherit' });
        console.log('✅ Prisma client generated!\n');
    } catch (error) {
        console.log('❌ Failed to generate Prisma client. Please run "npx prisma generate" manually.\n');
    }
} else {
    console.log('✅ Prisma client already generated\n');
}

console.log('🚀 Setup complete!');
console.log('\nNext steps:');
console.log('1. Edit .env with your database credentials');
console.log('2. Set up a PostgreSQL database');
console.log('3. Run: npm run db:push');
console.log('4. Run: npm run db:seed');
console.log('5. Run: npm run dev');
console.log('\nFor help, see README.md'); 