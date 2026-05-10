const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data (optional, but avoids replica set issues in some environments)
  // await prisma.task.deleteMany({});
  // await prisma.user.deleteMany({});


  // Create a test user for Sign-In
  const hashedPassword = await bcrypt.hash('password123', 12);
  const testUser = await prisma.user.create({
    data: {
      name: 'Test User',
      email: 'testuser@example.com',
      password: hashedPassword
    }
  });

  console.log('✅ Seed successful!');

  console.log('--- TEST DATA ---');
  console.log('Email: testuser@example.com');
  console.log('Password: password123');
  console.log('-----------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
