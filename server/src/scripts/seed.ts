import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { Sale } from '../models/Sale';
import { StockMovement } from '../models/StockMovement';
import { SaleReturn } from '../models/SaleReturn';
import { Counter } from '../models/Counter';

const sampleProducts = [
  // Beverages
  { sku: 'BEV-CLD-001', name: 'Cold Brew Coffee 330ml', category: 'Beverages', purchasePrice: 90, sellingPrice: 160, stock: 45, reorderLevel: 10 },
  { sku: 'BEV-TEA-002', name: 'Matcha Green Tea Latte', category: 'Beverages', purchasePrice: 120, sellingPrice: 220, stock: 20, reorderLevel: 8 },
  { sku: 'BEV-KOM-003', name: 'Ginger Lemon Kombucha', category: 'Beverages', purchasePrice: 110, sellingPrice: 195, stock: 4, reorderLevel: 6 }, // LOW
  { sku: 'BEV-JUC-004', name: 'Cold Pressed Orange Juice', category: 'Beverages', purchasePrice: 80, sellingPrice: 150, stock: 0, reorderLevel: 5 }, // OUT
  { sku: 'BEV-WAT-005', name: 'Sparkling Mineral Water 500ml', category: 'Beverages', purchasePrice: 25, sellingPrice: 60, stock: 80, reorderLevel: 15 },
  { sku: 'BEV-OAT-006', name: 'Barista Oat Milk 1L', category: 'Beverages', purchasePrice: 180, sellingPrice: 290, stock: 2, reorderLevel: 8 }, // LOW

  // Snacks & Confectionery
  { sku: 'SNK-ALM-001', name: 'Roasted Salted Almonds 150g', category: 'Snacks & Confectionery', purchasePrice: 180, sellingPrice: 320, stock: 35, reorderLevel: 10 },
  { sku: 'SNK-CHX-002', name: 'Dark Chocolate Sea Salt Bar', category: 'Snacks & Confectionery', purchasePrice: 95, sellingPrice: 180, stock: 5, reorderLevel: 10 }, // LOW
  { sku: 'SNK-CHP-003', name: 'Artisan Truffle Potato Chips', category: 'Snacks & Confectionery', purchasePrice: 60, sellingPrice: 120, stock: 28, reorderLevel: 8 },
  { sku: 'SNK-GRA-004', name: 'Organic Berry Granola Bar', category: 'Snacks & Confectionery', purchasePrice: 40, sellingPrice: 80, stock: 0, reorderLevel: 12 }, // OUT
  { sku: 'SNK-POX-005', name: 'White Cheddar Popcorn 100g', category: 'Snacks & Confectionery', purchasePrice: 50, sellingPrice: 110, stock: 22, reorderLevel: 6 },
  { sku: 'SNK-GUM-006', name: 'Sour Fruity Gummies 120g', category: 'Snacks & Confectionery', purchasePrice: 45, sellingPrice: 90, stock: 18, reorderLevel: 5 },

  // Bakery
  { sku: 'BAK-SRD-001', name: 'Artisan Sourdough Loaf', category: 'Bakery', purchasePrice: 90, sellingPrice: 190, stock: 14, reorderLevel: 5 },
  { sku: 'BAK-CRO-002', name: 'French Butter Croissant', category: 'Bakery', purchasePrice: 50, sellingPrice: 110, stock: 3, reorderLevel: 8 }, // LOW
  { sku: 'BAK-BAG-003', name: 'Everything Bagel 4-Pack', category: 'Bakery', purchasePrice: 80, sellingPrice: 160, stock: 12, reorderLevel: 4 },
  { sku: 'BAK-MUF-004', name: 'Blueberry Streusel Muffin', category: 'Bakery', purchasePrice: 60, sellingPrice: 130, stock: 0, reorderLevel: 6 }, // OUT
  { sku: 'BAK-CIN-005', name: 'Gourmet Cinnamon Roll', category: 'Bakery', purchasePrice: 70, sellingPrice: 140, stock: 9, reorderLevel: 5 },
  { sku: 'BAK-BRD-006', name: 'Multigrain Seeded Loaf', category: 'Bakery', purchasePrice: 55, sellingPrice: 120, stock: 11, reorderLevel: 4 },

  // Dairy & Eggs
  { sku: 'DRY-MLK-001', name: 'Organic Whole Milk 2L', category: 'Dairy & Eggs', purchasePrice: 90, sellingPrice: 140, stock: 26, reorderLevel: 8 },
  { sku: 'DRY-EGG-002', name: 'Free-Range Brown Eggs 12ct', category: 'Dairy & Eggs', purchasePrice: 90, sellingPrice: 150, stock: 4, reorderLevel: 10 }, // LOW
  { sku: 'DRY-YOG-003', name: 'Greek Honey Yogurt 500g', category: 'Dairy & Eggs', purchasePrice: 110, sellingPrice: 210, stock: 15, reorderLevel: 6 },
  { sku: 'DRY-BUT-004', name: 'Cultured Salted Butter 250g', category: 'Dairy & Eggs', purchasePrice: 120, sellingPrice: 220, stock: 19, reorderLevel: 5 },
  { sku: 'DRY-CHD-005', name: 'Aged English Cheddar 200g', category: 'Dairy & Eggs', purchasePrice: 180, sellingPrice: 320, stock: 0, reorderLevel: 5 }, // OUT
  { sku: 'DRY-MOZ-006', name: 'Fresh Buffalo Mozzarella', category: 'Dairy & Eggs', purchasePrice: 140, sellingPrice: 260, stock: 8, reorderLevel: 4 },

  // Fresh Produce
  { sku: 'PRD-AVO-001', name: 'Hass Avocados (Net of 3)', category: 'Fresh Produce', purchasePrice: 140, sellingPrice: 260, stock: 24, reorderLevel: 6 },
  { sku: 'PRD-BAN-002', name: 'Organic Fair-Trade Bananas (1kg)', category: 'Fresh Produce', purchasePrice: 40, sellingPrice: 80, stock: 40, reorderLevel: 10 },
  { sku: 'PRD-BER-003', name: 'Fresh Strawberries 250g', category: 'Fresh Produce', purchasePrice: 100, sellingPrice: 180, stock: 3, reorderLevel: 8 }, // LOW
  { sku: 'PRD-SPL-004', name: 'Baby Spinach Bag 200g', category: 'Fresh Produce', purchasePrice: 30, sellingPrice: 70, stock: 16, reorderLevel: 5 },
  { sku: 'PRD-TOM-005', name: 'Cherry Vine Tomatoes 300g', category: 'Fresh Produce', purchasePrice: 45, sellingPrice: 90, stock: 18, reorderLevel: 5 },

  // Household & Personal Care
  { sku: 'HSE-DSH-001', name: 'Eco Lemon Dish Soap 500ml', category: 'Household & Personal Care', purchasePrice: 85, sellingPrice: 160, stock: 30, reorderLevel: 8 },
  { sku: 'HSE-HND-002', name: 'Lavender Foaming Hand Wash', category: 'Household & Personal Care', purchasePrice: 95, sellingPrice: 199, stock: 2, reorderLevel: 6 }, // LOW
  { sku: 'HSE-PPR-003', name: 'Recycled Paper Towels 3-Roll', category: 'Household & Personal Care', purchasePrice: 110, sellingPrice: 220, stock: 22, reorderLevel: 7 },
  { sku: 'HSE-CLN-004', name: 'Multi-Surface Cleaner 750ml', category: 'Household & Personal Care', purchasePrice: 90, sellingPrice: 175, stock: 17, reorderLevel: 5 }
];

const seedDatabase = async () => {
  try {
    console.log('Connecting to database for seeding...');
    await mongoose.connect(env.MONGODB_URI);

    console.log('Clearing old collections...');
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Sale.deleteMany({}),
      StockMovement.deleteMany({}),
      SaleReturn.deleteMany({}),
      Counter.deleteMany({})
    ]);

    console.log('Creating demo users...');
    const adminUser = await User.create({
      name: 'Admin Manager',
      email: 'admin@demo.com',
      password: 'Admin@123',
      role: 'Admin'
    });

    const staffUser = await User.create({
      name: 'Staff Cashier',
      email: 'staff@demo.com',
      password: 'Staff@123',
      role: 'Staff'
    });

    console.log('Inserting products and recording initial stock movements...');
    const createdProducts = [];
    for (const prodData of sampleProducts) {
      const product = await Product.create(prodData);
      createdProducts.push(product);

      if (prodData.stock > 0) {
        await StockMovement.create({
          product: product._id,
          type: 'RECEIVED',
          quantity: prodData.stock,
          quantityBefore: 0,
          quantityAfter: prodData.stock,
          reason: 'Initial inventory seeding',
          reference: 'INIT-SEED',
          user: adminUser._id
        });
      }
    }

    console.log('Generating sample historical sales...');
    const p1 = createdProducts.find(p => p.sku === 'BEV-CLD-001')!;
    const p2 = createdProducts.find(p => p.sku === 'SNK-ALM-001')!;
    const p3 = createdProducts.find(p => p.sku === 'BAK-SRD-001')!;

    // Sale 1
    const subtotal1 = p1.sellingPrice * 2 + p2.sellingPrice;
    const discountAmount1 = Math.round(subtotal1 * 0.1 * 100) / 100;
    const taxAmount1 = Math.round((subtotal1 - discountAmount1) * 0.05 * 100) / 100;
    const total1 = Math.round((subtotal1 - discountAmount1 + taxAmount1) * 100) / 100;

    const sale1 = await Sale.create({
      invoiceNumber: 'INV-20261016-0001',
      items: [
        {
          product: p1._id,
          skuSnapshot: p1.sku,
          nameSnapshot: p1.name,
          unitPrice: p1.sellingPrice,
          unitCost: p1.purchasePrice,
          quantity: 2,
          lineTotal: p1.sellingPrice * 2
        },
        {
          product: p2._id,
          skuSnapshot: p2.sku,
          nameSnapshot: p2.name,
          unitPrice: p2.sellingPrice,
          unitCost: p2.purchasePrice,
          quantity: 1,
          lineTotal: p2.sellingPrice
        }
      ],
      subtotal: subtotal1,
      discountType: 'percentage',
      discountValue: 10,
      discountAmount: discountAmount1,
      taxRate: 5,
      taxAmount: taxAmount1,
      total: total1,
      status: 'Completed',
      soldBy: staffUser._id,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    });

    await StockMovement.create([
      {
        product: p1._id,
        type: 'SALE',
        quantity: 2,
        quantityBefore: p1.stock + 2,
        quantityAfter: p1.stock,
        reason: 'Sale INV-20261016-0001',
        reference: 'INV-20261016-0001',
        user: staffUser._id,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        product: p2._id,
        type: 'SALE',
        quantity: 1,
        quantityBefore: p2.stock + 1,
        quantityAfter: p2.stock,
        reason: 'Sale INV-20261016-0001',
        reference: 'INV-20261016-0001',
        user: staffUser._id,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    ]);

    // Sale 2 with a partial return
    const subtotal2 = p3.sellingPrice * 2;
    const taxAmount2 = Math.round(subtotal2 * 0.05 * 100) / 100;
    const total2 = Math.round((subtotal2 + taxAmount2) * 100) / 100;

    const sale2 = await Sale.create({
      invoiceNumber: 'INV-20261017-0002',
      items: [
        {
          product: p3._id,
          skuSnapshot: p3.sku,
          nameSnapshot: p3.name,
          unitPrice: p3.sellingPrice,
          unitCost: p3.purchasePrice,
          quantity: 2,
          lineTotal: p3.sellingPrice * 2
        }
      ],
      subtotal: subtotal2,
      discountType: 'none',
      discountValue: 0,
      discountAmount: 0,
      taxRate: 5,
      taxAmount: taxAmount2,
      total: total2,
      status: 'PartiallyReturned',
      soldBy: adminUser._id,
      createdAt: new Date()
    });

    // Return 1 loaf of sourdough
    await SaleReturn.create({
      sale: sale2._id,
      items: [
        {
          product: p3._id,
          quantity: 1,
          refundAmount: p3.sellingPrice
        }
      ],
      reason: 'Packaging damaged by customer accidentally',
      processedBy: adminUser._id,
      createdAt: new Date()
    });

    await StockMovement.create({
      product: p3._id,
      type: 'RETURN',
      quantity: 1,
      quantityBefore: p3.stock - 1,
      quantityAfter: p3.stock,
      reason: 'Sale Return (INV-20261017-0002): Packaging damaged by customer accidentally',
      reference: 'INV-20261017-0002',
      user: adminUser._id,
      createdAt: new Date()
    });

    console.log('Seeding completed successfully!');
    console.log(`- Created Admin: admin@demo.com / Admin@123`);
    console.log(`- Created Staff: staff@demo.com / Staff@123`);
    console.log(`- Inserted ${createdProducts.length} products across 6 categories`);
    console.log(`- Created sample sales, returns, and stock movement logs`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
