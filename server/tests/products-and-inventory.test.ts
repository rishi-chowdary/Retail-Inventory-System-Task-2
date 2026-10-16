import request from 'supertest';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { Product } from '../src/models/Product';
import { StockMovement } from '../src/models/StockMovement';

const app = createApp();

describe('Products & Inventory Rules', () => {
  let adminToken: string;

  beforeEach(async () => {
    await User.create({
      name: 'Admin User',
      email: 'admin@demo.com',
      password: 'Admin@123',
      role: 'Admin'
    });

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@demo.com', password: 'Admin@123' });
    adminToken = adminLogin.body.data.token;
  });

  it('correctly categorizes low-stock boundary where stock == reorderLevel (inclusive)', async () => {
    // Product A: stock (5) == reorderLevel (5) -> must be in low stock
    await Product.create({
      sku: 'LOW-BND-001',
      name: 'Boundary Low Stock',
      category: 'Snacks',
      purchasePrice: 2,
      sellingPrice: 4,
      stock: 5,
      reorderLevel: 5,
      isActive: true
    });

    // Product B: stock (6) > reorderLevel (5) -> NOT in low stock
    await Product.create({
      sku: 'NRM-STK-002',
      name: 'Normal Stock',
      category: 'Snacks',
      purchasePrice: 2,
      sellingPrice: 4,
      stock: 6,
      reorderLevel: 5,
      isActive: true
    });

    // Product C: stock (0) -> out of stock
    await Product.create({
      sku: 'OUT-STK-003',
      name: 'Out of Stock',
      category: 'Snacks',
      purchasePrice: 2,
      sellingPrice: 4,
      stock: 0,
      reorderLevel: 5,
      isActive: true
    });

    const res = await request(app)
      .get('/api/inventory/low-stock')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const lowStockSkus = res.body.data.map((p: any) => p.sku);
    expect(lowStockSkus).toContain('LOW-BND-001');
    expect(lowStockSkus).toContain('OUT-STK-003');
    expect(lowStockSkus).not.toContain('NRM-STK-002');
  });

  it('prevents negative stock on manual adjustments (409)', async () => {
    const product = await Product.create({
      sku: 'NEG-TST-001',
      name: 'Stock Check Item',
      category: 'Bakery',
      purchasePrice: 3,
      sellingPrice: 6,
      stock: 3,
      reorderLevel: 2,
      isActive: true
    });

    // Attempt to remove 5 units when only 3 exist
    const res = await request(app)
      .post('/api/inventory/adjustments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: product._id.toString(),
        type: 'remove',
        quantity: 5,
        reason: 'Expired items'
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');

    // Confirm DB stock remains untouched at 3
    const freshProduct = await Product.findById(product._id);
    expect(freshProduct?.stock).toBe(3);
  });

  it('records an audit StockMovement for every stock adjustment', async () => {
    const product = await Product.create({
      sku: 'AUD-TST-001',
      name: 'Audit Item',
      category: 'Beverages',
      purchasePrice: 1.5,
      sellingPrice: 3.0,
      stock: 10,
      reorderLevel: 3,
      isActive: true
    });

    const res = await request(app)
      .post('/api/inventory/adjustments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: product._id.toString(),
        type: 'add',
        quantity: 7,
        reason: 'Correction found in stockroom',
        reference: 'AUDIT-REF-101'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.product.stock).toBe(17);

    const movement = await StockMovement.findOne({ product: product._id, type: 'ADJUSTMENT_ADD' });
    expect(movement).toBeDefined();
    expect(movement?.quantity).toBe(7);
    expect(movement?.quantityBefore).toBe(10);
    expect(movement?.quantityAfter).toBe(17);
    expect(movement?.reference).toBe('AUDIT-REF-101');
  });
});
