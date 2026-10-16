import request from 'supertest';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { Product } from '../src/models/Product';
import { Sale } from '../src/models/Sale';
import { StockMovement } from '../src/models/StockMovement';

const app = createApp();

describe('Sales Atomic Transactions & Returns', () => {
  let adminToken: string;
  let staffToken: string;

  beforeEach(async () => {
    await User.create({
      name: 'Admin User',
      email: 'admin@demo.com',
      password: 'Admin@123',
      role: 'Admin'
    });

    await User.create({
      name: 'Staff User',
      email: 'staff@demo.com',
      password: 'Staff@123',
      role: 'Staff'
    });

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@demo.com', password: 'Admin@123' });
    adminToken = adminLogin.body.data.token;

    const staffLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff@demo.com', password: 'Staff@123' });
    staffToken = staffLogin.body.data.token;
  });

  it('rolls back completely if any item in a multi-item sale has insufficient stock', async () => {
    const productA = await Product.create({
      sku: 'ROLL-AAA-001',
      name: 'Item A',
      category: 'Beverages',
      purchasePrice: 2,
      sellingPrice: 5,
      stock: 10,
      reorderLevel: 2,
      isActive: true
    });

    const productB = await Product.create({
      sku: 'ROLL-BBB-002',
      name: 'Item B',
      category: 'Beverages',
      purchasePrice: 3,
      sellingPrice: 7,
      stock: 2, // only 2 in stock
      reorderLevel: 1,
      isActive: true
    });

    // Request 3 of Item A (valid) and 5 of Item B (insufficient)
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        items: [
          { productId: productA._id.toString(), quantity: 3 },
          { productId: productB._id.toString(), quantity: 5 }
        ]
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(res.body.error.details.availableStock).toBe(2);

    // Verify atomic rollback: productA stock MUST still be 10!
    const checkProductA = await Product.findById(productA._id);
    const checkProductB = await Product.findById(productB._id);
    expect(checkProductA?.stock).toBe(10);
    expect(checkProductB?.stock).toBe(2);

    // Verify no sale and no movements created
    const salesCount = await Sale.countDocuments();
    const movementsCount = await StockMovement.countDocuments();
    expect(salesCount).toBe(0);
    expect(movementsCount).toBe(0);
  });

  it('ignores client price tampering and recalculates totals strictly from database', async () => {
    const product = await Product.create({
      sku: 'PRC-TAMP-001',
      name: 'Tamper Test Item',
      category: 'Electronics',
      purchasePrice: 10,
      sellingPrice: 50, // True price is 50
      stock: 10,
      reorderLevel: 2,
      isActive: true
    });

    // Client attempts to pass a tampered price of 1.00
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        items: [
          {
            productId: product._id.toString(),
            quantity: 2,
            unitPrice: 1.0, // Should be ignored
            lineTotal: 2.0 // Should be ignored
          }
        ],
        subtotal: 2.0, // Should be ignored
        total: 2.0 // Should be ignored
      });

    expect(res.status).toBe(201);
    expect(res.body.data.subtotal).toBe(100); // 2 * 50 = 100
    expect(res.body.data.total).toBe(100);
    expect(res.body.data.items[0].unitPrice).toBe(50);
  });

  it('merges duplicate products submitted within a single sale', async () => {
    const product = await Product.create({
      sku: 'MRG-PROD-001',
      name: 'Merge Item',
      category: 'Snacks',
      purchasePrice: 2,
      sellingPrice: 4,
      stock: 10,
      reorderLevel: 2,
      isActive: true
    });

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        items: [
          { productId: product._id.toString(), quantity: 2 },
          { productId: product._id.toString(), quantity: 3 }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].quantity).toBe(5);
    expect(res.body.data.subtotal).toBe(20);

    const checkProduct = await Product.findById(product._id);
    expect(checkProduct?.stock).toBe(5);
  });

  it('ensures concurrent sales cannot oversell available stock', async () => {
    const product = await Product.create({
      sku: 'CONC-OVR-001',
      name: 'Limited Edition Mug',
      category: 'Household',
      purchasePrice: 5,
      sellingPrice: 15,
      stock: 5, // Only 5 in stock
      reorderLevel: 1,
      isActive: true
    });

    // Fire 2 concurrent requests each asking for 4 units (total 8 > 5)
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          items: [{ productId: product._id.toString(), quantity: 4 }]
        }),
      request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          items: [{ productId: product._id.toString(), quantity: 4 }]
        })
    ]);

    const statuses = [res1.status, res2.status].sort();
    // One must succeed (201) and the other must be rejected (409)
    expect(statuses).toEqual([201, 409]);

    const checkProduct = await Product.findById(product._id);
    expect(checkProduct?.stock).toBe(1); // 5 - 4 = 1, never negative
  });

  it('maintains consistency between sale, product stock, and audit stock movement', async () => {
    const product = await Product.create({
      sku: 'CSN-ITEM-001',
      name: 'Consistent Item',
      category: 'Beverages',
      purchasePrice: 1.5,
      sellingPrice: 3.5,
      stock: 20,
      reorderLevel: 5,
      isActive: true
    });

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        items: [{ productId: product._id.toString(), quantity: 4 }]
      });

    expect(res.status).toBe(201);
    const invoiceNumber = res.body.data.invoiceNumber;
    expect(invoiceNumber).toMatch(/^INV-\d{8}-\d{4}$/);

    // Product stock decreased by 4
    const freshProduct = await Product.findById(product._id);
    expect(freshProduct?.stock).toBe(16);

    // Stock movement accurately recorded
    const movement = await StockMovement.findOne({ reference: invoiceNumber });
    expect(movement).toBeDefined();
    expect(movement?.type).toBe('SALE');
    expect(movement?.quantity).toBe(4);
    expect(movement?.quantityBefore).toBe(20);
    expect(movement?.quantityAfter).toBe(16);
  });

  it('restores product stock, creates a RETURN movement, and updates sale status on return', async () => {
    const product = await Product.create({
      sku: 'RET-ITEM-001',
      name: 'Returnable Item',
      category: 'Snacks',
      purchasePrice: 2,
      sellingPrice: 6,
      stock: 10,
      reorderLevel: 2,
      isActive: true
    });

    // Make initial sale of 4 items
    const saleRes = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        items: [{ productId: product._id.toString(), quantity: 4 }]
      });

    const saleId = saleRes.body.data._id;
    let freshProduct = await Product.findById(product._id);
    expect(freshProduct?.stock).toBe(6); // 10 - 4 = 6

    // Admin processes return of 2 items
    const returnRes = await request(app)
      .post(`/api/sales/${saleId}/returns`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ productId: product._id.toString(), quantity: 2 }],
        reason: 'Customer requested refund'
      });

    expect(returnRes.status).toBe(201);
    expect(returnRes.body.data.updatedSale.status).toBe('PartiallyReturned');

    // Product stock restored by 2
    freshProduct = await Product.findById(product._id);
    expect(freshProduct?.stock).toBe(8); // 6 + 2 = 8

    // StockMovement of type RETURN verified
    const returnMovement = await StockMovement.findOne({
      product: product._id,
      type: 'RETURN'
    });
    expect(returnMovement).toBeDefined();
    expect(returnMovement?.quantity).toBe(2);
    expect(returnMovement?.quantityBefore).toBe(6);
    expect(returnMovement?.quantityAfter).toBe(8);

    // Cannot return more than remaining sold (2 remaining)
    const excessReturnRes = await request(app)
      .post(`/api/sales/${saleId}/returns`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ productId: product._id.toString(), quantity: 3 }],
        reason: 'Excess return'
      });

    expect(excessReturnRes.status).toBe(400);
    expect(excessReturnRes.body.error.code).toBe('EXCESS_RETURN_QUANTITY');
  });
});
