import argon2 from 'argon2';
import { prisma } from './db/prisma.js';

/** Cloud kitchen inventory master – rolls + momos. Units: kg, ltr, pcs, pkt */
const INVENTORY_MASTER = [
  // BASE / CORE INGREDIENTS
  { name: 'Refined Wheat Flour (Maida)', uom: 'kg', category: 'BASE_CORE', reorderPoint: 25 },
  { name: 'All Purpose Flour – Premium', uom: 'kg', category: 'BASE_CORE', reorderPoint: 20 },
  { name: 'Corn Flour', uom: 'kg', category: 'BASE_CORE', reorderPoint: 5 },
  { name: 'Rice Flour', uom: 'kg', category: 'BASE_CORE', reorderPoint: 5 },
  { name: 'Bread Crumbs', uom: 'kg', category: 'BASE_CORE', reorderPoint: 3 },
  // VEG FILLINGS
  { name: 'Cabbage Fresh', uom: 'kg', category: 'VEG_FILLINGS', reorderPoint: 10 },
  { name: 'Carrot Fresh', uom: 'kg', category: 'VEG_FILLINGS', reorderPoint: 5 },
  { name: 'Onion Red', uom: 'kg', category: 'VEG_FILLINGS', reorderPoint: 15 },
  { name: 'Capsicum Green', uom: 'kg', category: 'VEG_FILLINGS', reorderPoint: 5 },
  { name: 'Capsicum Red', uom: 'kg', category: 'VEG_FILLINGS', reorderPoint: 3 },
  { name: 'Spring Onion', uom: 'kg', category: 'VEG_FILLINGS', reorderPoint: 2 },
  { name: 'Green Chilli', uom: 'kg', category: 'VEG_FILLINGS', reorderPoint: 2 },
  { name: 'Garlic Fresh', uom: 'kg', category: 'VEG_FILLINGS', reorderPoint: 3 },
  { name: 'Ginger Fresh', uom: 'kg', category: 'VEG_FILLINGS', reorderPoint: 3 },
  { name: 'Button Mushroom', uom: 'kg', category: 'VEG_FILLINGS', reorderPoint: 3 },
  { name: 'Paneer Full Fat', uom: 'kg', category: 'VEG_FILLINGS', reorderPoint: 5 },
  // NON-VEG
  { name: 'Chicken Boneless Breast', uom: 'kg', category: 'NON_VEG', reorderPoint: 10 },
  { name: 'Chicken Mince (Keema)', uom: 'kg', category: 'NON_VEG', reorderPoint: 8 },
  { name: 'Chicken Sausage', uom: 'kg', category: 'NON_VEG', reorderPoint: 3 },
  { name: 'Chicken Seekh Kebab', uom: 'kg', category: 'NON_VEG', reorderPoint: 5 },
  { name: 'Eggs White Shell', uom: 'pcs', category: 'NON_VEG', reorderPoint: 60 },
  // MOMOS SPECIFIC
  { name: 'Momos Wrapper Sheet', uom: 'kg', category: 'MOMOS_SPECIFIC', reorderPoint: 5 },
  { name: 'Soya Chunks Mini', uom: 'kg', category: 'MOMOS_SPECIFIC', reorderPoint: 2 },
  { name: 'MSG / Ajinomoto', uom: 'kg', category: 'MOMOS_SPECIFIC', reorderPoint: 0.5 },
  { name: 'White Pepper Powder', uom: 'kg', category: 'MOMOS_SPECIFIC', reorderPoint: 0.5 },
  // ROLLS / WRAPS
  { name: 'Roomali Roti Base', uom: 'pcs', category: 'ROLLS_WRAPS', reorderPoint: 200 },
  { name: 'Whole Wheat Wrap Base', uom: 'pcs', category: 'ROLLS_WRAPS', reorderPoint: 150 },
  { name: 'Butter Unsalted', uom: 'kg', category: 'ROLLS_WRAPS', reorderPoint: 5 },
  { name: 'Cheese Slice', uom: 'pcs', category: 'ROLLS_WRAPS', reorderPoint: 100 },
  // SPICES & MASALA
  { name: 'Salt Refined', uom: 'kg', category: 'SPICES_MASALA', reorderPoint: 5 },
  { name: 'Red Chilli Powder', uom: 'kg', category: 'SPICES_MASALA', reorderPoint: 2 },
  { name: 'Turmeric Powder', uom: 'kg', category: 'SPICES_MASALA', reorderPoint: 1 },
  { name: 'Coriander Powder', uom: 'kg', category: 'SPICES_MASALA', reorderPoint: 1 },
  { name: 'Garam Masala', uom: 'kg', category: 'SPICES_MASALA', reorderPoint: 0.5 },
  { name: 'Chat Masala', uom: 'kg', category: 'SPICES_MASALA', reorderPoint: 0.5 },
  { name: 'Black Pepper Powder', uom: 'kg', category: 'SPICES_MASALA', reorderPoint: 0.5 },
  // SAUCES
  { name: 'Mayonnaise Classic', uom: 'kg', category: 'SAUCES', reorderPoint: 5 },
  { name: 'Eggless Mayonnaise', uom: 'kg', category: 'SAUCES', reorderPoint: 3 },
  { name: 'Schezwan Sauce', uom: 'kg', category: 'SAUCES', reorderPoint: 3 },
  { name: 'Red Chilli Sauce', uom: 'kg', category: 'SAUCES', reorderPoint: 3 },
  { name: 'Green Chilli Sauce', uom: 'kg', category: 'SAUCES', reorderPoint: 3 },
  { name: 'Tomato Ketchup', uom: 'kg', category: 'SAUCES', reorderPoint: 5 },
  { name: 'Soy Sauce Dark', uom: 'ltr', category: 'SAUCES', reorderPoint: 2 },
  { name: 'Vinegar White', uom: 'ltr', category: 'SAUCES', reorderPoint: 1 },
  // OILS & FATS
  { name: 'Refined Sunflower Oil', uom: 'ltr', category: 'OILS_FATS', reorderPoint: 20 },
  { name: 'Butter Cooking', uom: 'kg', category: 'OILS_FATS', reorderPoint: 5 },
  // PACKAGING
  { name: 'Butter Paper Sheets', uom: 'pcs', category: 'PACKAGING', reorderPoint: 500 },
  { name: 'Foil Paper Roll', uom: 'pcs', category: 'PACKAGING', reorderPoint: 20 },
  { name: 'Momos Box Small', uom: 'pcs', category: 'PACKAGING', reorderPoint: 200 },
  { name: 'Roll Packaging Box', uom: 'pcs', category: 'PACKAGING', reorderPoint: 200 },
  { name: 'Carry Bag Medium', uom: 'pcs', category: 'PACKAGING', reorderPoint: 300 },
  { name: 'Tissue Paper', uom: 'pkt', category: 'PACKAGING', reorderPoint: 20 },
  { name: 'Disposable Spoon', uom: 'pcs', category: 'PACKAGING', reorderPoint: 200 },
  // MISC / MINUTE-TO-MINUTE
  { name: 'Dishwash Liquid', uom: 'ltr', category: 'MISC', reorderPoint: 2 },
  { name: 'Hand Gloves Disposable', uom: 'pkt', category: 'MISC', reorderPoint: 5 },
  { name: 'Hair Net Cap', uom: 'pkt', category: 'MISC', reorderPoint: 3 },
  { name: 'Apron', uom: 'pcs', category: 'MISC', reorderPoint: 5 },
  { name: 'Cleaning Cloth', uom: 'pcs', category: 'MISC', reorderPoint: 10 },
];

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

  const storekeeperHash = await argon2.hash('store123');
  await prisma.user.upsert({
    where: { email: 'store@rollcraft.local' },
    create: {
      email: 'store@rollcraft.local',
      passwordHash: storekeeperHash,
      role: 'STOREKEEPER',
      kitchenId: king.id,
      employeeProfile: {
        create: {
          fullName: 'Store Keeper',
          baseSalaryMonthly: 35000,
          overtimeRatePerHour: 150,
          latePenaltyPerMinute: 1,
        },
      },
    },
    update: {},
  });

  const supplier = await prisma.supplier.upsert({
    where: { id: 'supplier_1' },
    create: { id: 'supplier_1', name: 'Bulk Foods Ltd', contact: '+91 98765 43210' },
    update: {},
  });

  const itemMap = new Map<string, string>();
  const getItemId = (name: string, uom: string) => itemMap.get(`${name}::${uom}`);

  for (const it of INVENTORY_MASTER) {
    const item = await prisma.item.upsert({
      where: { name_uom: { name: it.name, uom: it.uom } },
      create: {
        name: it.name,
        uom: it.uom,
        reorderPoint: it.reorderPoint,
        category: it.category,
        isActive: true,
      },
      update: { category: it.category, reorderPoint: it.reorderPoint },
    });
    itemMap.set(`${it.name}::${it.uom}`, item.id);
  }

  const kingStock: Record<string, number> = {};
  for (const it of INVENTORY_MASTER) {
    const id = getItemId(it.name, it.uom);
    if (!id) continue;
    kingStock[id] = Math.max(it.reorderPoint * 3, 5);
  }

  for (const [itemId, qty] of Object.entries(kingStock)) {
    await prisma.kitchenStock.upsert({
      where: { kitchenId_itemId: { kitchenId: king.id, itemId } },
      create: { kitchenId: king.id, itemId, onHandQty: qty, avgCost: 50 },
      update: { onHandQty: qty },
    });
  }

  const branchStock: Record<string, number> = {};
  for (const it of INVENTORY_MASTER) {
    const id = getItemId(it.name, it.uom);
    if (!id) continue;
    branchStock[id] = Math.max(it.reorderPoint * 1.5, 2);
  }

  for (const [itemId, qty] of Object.entries(branchStock)) {
    await prisma.kitchenStock.upsert({
      where: { kitchenId_itemId: { kitchenId: branch.id, itemId } },
      create: { kitchenId: branch.id, itemId, onHandQty: qty, avgCost: 50 },
      update: { onHandQty: qty },
    });
  }

  const flourId = getItemId('Refined Wheat Flour (Maida)', 'kg');
  const cabbageId = getItemId('Cabbage Fresh', 'kg');

  if (flourId && cabbageId) {
    const now = new Date();
    for (let d = 0; d < 7; d++) {
      const day = new Date(now);
      day.setDate(day.getDate() - d);
      day.setHours(10, 0, 0, 0);
      await prisma.stockLedger.create({
        data: {
          kitchenId: king.id,
          itemId: flourId,
          type: 'CONSUMPTION',
          qtyDelta: -(8 + Math.floor(Math.random() * 5)),
          unitCost: 48,
          refType: 'CONSUMPTION',
          createdByUserId: admin.id,
          createdAt: day,
        },
      });
      await prisma.stockLedger.create({
        data: {
          kitchenId: king.id,
          itemId: cabbageId,
          type: 'CONSUMPTION',
          qtyDelta: -(3 + Math.floor(Math.random() * 3)),
          unitCost: 25,
          refType: 'CONSUMPTION',
          createdByUserId: admin.id,
          createdAt: day,
        },
      });
    }
  }

  console.log('Seeded:');
  console.log('- kitchens:', king.name, ',', branch.name);
  console.log('- users: admin@rollcraft.local (admin123), store@rollcraft.local (store123)');
  console.log('- items:', INVENTORY_MASTER.length, 'SKUs across', Object.keys(CATEGORY_LABELS).length, 'categories');
  console.log('- supplier:', supplier.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
