require('dotenv').config(); // Load environment variables from .env

const { PrismaClient } = require('../generated/prisma');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const seed = async () => {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error('ADMIN_PASSWORD environment variable not set in .env!');
      return;
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {
        isAdmin: true,
        password: hashedPassword,
      },
      create: {
        username: 'admin',
        password: hashedPassword,
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        phoneNumber: '123-456-7890',
        yearGraduated: 2000,
        approved: true,
        isAdmin: true,
      },
    });

    console.log('Admin user created or updated:', adminUser);
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
};

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });