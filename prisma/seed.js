const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create test user (for development)
  if (process.env.NODE_ENV === 'development') {
    console.log('👤 Creating test user...');
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
        timezone: 'UTC',
        sleepTime: '22:00',
        wakeTime: '07:00',
        backgroundSounds: ['Ocean Waves', 'White Noise'],
        autoDisconnect: true,
        disconnectTime: 480, // 8 hours
        allowAnalytics: true,
        showOnline: true
      }
    });

    // Create analytics for test user
    await prisma.sleepAnalytics.upsert({
      where: { userId: testUser.id },
      update: {},
      create: {
        userId: testUser.id,
        totalSessions: 5,
        totalDuration: 2400, // 40 hours
        averageQuality: 4.2,
        averageDuration: 480, // 8 hours
        lastSession: new Date()
      }
    });
  }

  console.log('✅ Database seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 