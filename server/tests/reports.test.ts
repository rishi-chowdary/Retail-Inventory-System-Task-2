import request from 'supertest';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { Product } from '../src/models/Product';

const app = createApp();

describe('Reports & CSV Export', () => {
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

    // Create products
    const prodA = await Product.create({
      sku: 'REP-PROD-A',
      name: 'Report Item A',
      category: 'Beverages',
      purchasePrice: 2.0,
      sellingPrice: 5.0,
      stock: 50,
      reorderLevel: 5,
      isActive: true
    });

    const prodB = await Product.create({
      sku: 'REP-PROD-B',
      name: 'Report Item B',
      category: 'Snacks',
      purchasePrice: 1.0,
      sellingPrice: 3.0,
      stock: 50,
      reorderLevel: 5,
      isActive: true
    });

    // Create 2 sales
    await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        items: [{ productId: prodA._id.toString(), quantity: 2 }]
      });

    await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        items: [{ productId: prodB._id.toString(), quantity: 4 }],
        discountType: 'fixed',
        discountValue: 2.0
      });
  });

  it('generates sales metrics including top products and daily breakdown', async () => {
    const res = await request(app)
      .get('/api/reports/sales')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transactionCount).toBe(2);
    expect(res.body.data.totalSales).toBe(20.0); // Sale 1 (10) + Sale 2 (12 - 2 = 10)
    expect(res.body.data.topSellingProducts.length).toBeGreaterThan(0);
    expect(res.body.data.dailyBreakdown.length).toBeGreaterThan(0);
  });

  it('exports sales report as CSV download', async () => {
    const res = await request(app)
      .get('/api/reports/sales/export')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment; filename=');
    expect(res.text).toContain('Invoice Number');
    expect(res.text).toContain('Cashier');
  });

  it('allows Admin to view profit report, but restricts Staff (403)', async () => {
    // Staff access -> 403 Forbidden
    const staffRes = await request(app)
      .get('/api/reports/profit')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(staffRes.status).toBe(403);

    // Admin access -> 200
    const adminRes = await request(app)
      .get('/api/reports/profit')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data.netRevenue).toBeDefined();
    expect(adminRes.body.data.netProfit).toBeDefined();
    expect(adminRes.body.data.marginPercentage).toBeDefined();
  });
});
