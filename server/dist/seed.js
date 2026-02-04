import argon2 from 'argon2';
import { prisma } from './db/prisma.js';
const ITEMS = [
    { name: 'Rice', uom: 'kg', reorderPoint: 10, category: 'Grains' },
    { name: 'Cooking Oil', uom: 'L', reorderPoint: 20, category: 'Oils' },
    { name: 'Flour', uom: 'kg', reorderPoint: 15, category: 'Grains' },
    { name: 'Sugar', uom: 'kg', reorderPoint: 8, category: 'Sweeteners' },
    { name: 'Butter', uom: 'kg', reorderPoint: 5, category: 'Dairy' },
    { name: 'Yeast', uom: 'g', reorderPoint: 500, category: 'Leavening' },
    { name: 'Salt', uom: 'kg', reorderPoint: 3, category: 'Seasonings' },
    { name: 'Milk', uom: 'L', reorderPoint: 10, category: 'Dairy' },
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
    const items = [];
    for (const it of ITEMS) {
        const item = await prisma.item.upsert({
            where: { name_uom: { name: it.name, uom: it.uom } },
            create: { name: it.name, uom: it.uom, reorderPoint: it.reorderPoint, category: it.category },
            update: {},
        });
        items.push(item);
    }
    // Initial stock for King Kitchen
    const kingStock = {
        [items[0].id]: 120, // Rice 120 kg
        [items[1].id]: 25, // Oil 25 L
        [items[2].id]: 80, // Flour 80 kg
        [items[3].id]: 45, // Sugar 45 kg
        [items[4].id]: 28, // Butter 28 kg
        [items[5].id]: 500, // Yeast 500 g
        [items[6].id]: 15, // Salt 15 kg
        [items[7].id]: 20, // Milk 20 L
    };
    for (const [itemId, qty] of Object.entries(kingStock)) {
        await prisma.kitchenStock.upsert({
            where: {
                kitchenId_itemId: { kitchenId: king.id, itemId },
            },
            create: {
                kitchenId: king.id,
                itemId,
                onHandQty: qty,
                avgCost: 50,
            },
            update: { onHandQty: qty },
        });
    }
    // Branch stock (less)
    const branchStock = {
        [items[0].id]: 30,
        [items[1].id]: 8,
        [items[2].id]: 25,
        [items[3].id]: 12,
        [items[4].id]: 5,
        [items[5].id]: 200,
        [items[6].id]: 5,
        [items[7].id]: 6,
    };
    for (const [itemId, qty] of Object.entries(branchStock)) {
        await prisma.kitchenStock.upsert({
            where: {
                kitchenId_itemId: { kitchenId: branch.id, itemId },
            },
            create: {
                kitchenId: branch.id,
                itemId,
                onHandQty: qty,
                avgCost: 50,
            },
            update: { onHandQty: qty },
        });
    }
    // Sample ledger entries (consumption, purchases) for dashboard stats - last 7 days
    const now = new Date();
    for (let d = 0; d < 7; d++) {
        const day = new Date(now);
        day.setDate(day.getDate() - d);
        day.setHours(10, 0, 0, 0);
        await prisma.stockLedger.create({
            data: {
                kitchenId: king.id,
                itemId: items[2].id, // Flour
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
                itemId: items[0].id, // Rice
                type: 'CONSUMPTION',
                qtyDelta: -(5 + Math.floor(Math.random() * 4)),
                unitCost: 55,
                refType: 'CONSUMPTION',
                createdByUserId: admin.id,
                createdAt: day,
            },
        });
    }
    console.log('Seeded:');
    console.log('- kitchens:', king.name, ',', branch.name);
    console.log('- users: admin@rollcraft.local (admin123), store@rollcraft.local (store123)');
    console.log('- items:', ITEMS.length);
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
//# sourceMappingURL=seed.js.map