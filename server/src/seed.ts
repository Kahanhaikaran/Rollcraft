import argon2 from 'argon2';
import { prisma } from './db/prisma.js';

async function main() {
  const king = await prisma.kitchen.upsert({
    where: { id: 'king_kitchen' },
    create: {
      id: 'king_kitchen',
      name: 'King Kitchen',
      type: 'KING',
      geofenceRadiusMeters: 200,
    },
    update: {},
  });

  const branch = await prisma.kitchen.upsert({
    where: { id: 'branch_1' },
    create: {
      id: 'branch_1',
      name: 'Branch Kitchen 1',
      type: 'BRANCH',
      geofenceRadiusMeters: 200,
    },
    update: {},
  });

  const passwordHash = await argon2.hash('admin123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rollcraft.local' },
    create: {
      email: 'admin@rollcraft.local',
      passwordHash,
      role: 'ADMIN',
      kitchenId: king.id,
      employeeProfile: {
        create: {
          fullName: 'Admin User',
          baseSalaryMonthly: 50000,
          overtimeRatePerHour: 200,
          latePenaltyPerMinute: 2,
        },
      },
    },
    update: {},
  });

  await prisma.item.upsert({
    where: { name_uom: { name: 'Rice', uom: 'kg' } },
    create: { name: 'Rice', uom: 'kg', reorderPoint: 10 },
    update: {},
  });
  await prisma.item.upsert({
    where: { name_uom: { name: 'Cooking Oil', uom: 'L' } },
    create: { name: 'Cooking Oil', uom: 'L', reorderPoint: 20 },
    update: {},
  });

  console.log('Seeded:');
  console.log('- kitchens:', king.name, ',', branch.name);
  console.log('- admin:', admin.email, 'password: admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

