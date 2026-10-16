import request from 'supertest';
import { createApp } from '../src/app';
import { User } from '../src/models/User';

const app = createApp();

describe('Authentication & Role Authorization', () => {
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

  it('authenticates user and returns JWT token and user profile', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@demo.com', password: 'Admin@123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('admin@demo.com');
  });

  it('rejects invalid login credentials with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@demo.com', password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('allows Staff to view products, but blocks Staff from creating products (403)', async () => {
    // Staff reading products -> 200
    const listRes = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(listRes.status).toBe(200);

    // Staff creating product -> 403 Forbidden
    const createRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        sku: 'TEST-SKU-001',
        name: 'Test Product',
        category: 'Test Category',
        purchasePrice: 10,
        sellingPrice: 20,
        stock: 5,
        reorderLevel: 2
      });
    expect(createRes.status).toBe(403);
    expect(createRes.body.error.code).toBe('FORBIDDEN');
  });

  it('allows Admin to create products (201)', async () => {
    const createRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sku: 'ADMIN-PROD-001',
        name: 'Admin Product',
        category: 'Electronics',
        purchasePrice: 50,
        sellingPrice: 100,
        stock: 10,
        reorderLevel: 3
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.sku).toBe('ADMIN-PROD-001');
  });

  it('allows Staff to receive stock, but forbids Staff from manual stock removal adjustments (403)', async () => {
    // Admin creates product
    const prodRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sku: 'STK-PROD-001',
        name: 'Stock Product',
        category: 'Beverages',
        purchasePrice: 2,
        sellingPrice: 5,
        stock: 10,
        reorderLevel: 2
      });
    const productId = prodRes.body.data._id;

    // Staff receiving stock -> 201
    const receiveRes = await request(app)
      .post('/api/inventory/adjustments')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        productId,
        type: 'received',
        quantity: 5,
        reason: 'Received shipment'
      });
    expect(receiveRes.status).toBe(201);
    expect(receiveRes.body.data.product.stock).toBe(15);

    // Staff doing manual removal adjustment -> 403
    const removeRes = await request(app)
      .post('/api/inventory/adjustments')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        productId,
        type: 'remove',
        quantity: 2,
        reason: 'Damaged can'
      });
    expect(removeRes.status).toBe(403);
    expect(removeRes.body.error.code).toBe('FORBIDDEN');
  });
});
