export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Retail Inventory & Sales Management System API',
    version: '1.0.0',
    description:
      'Production-quality API for inventory tracking, atomic point-of-sale checkout, role-based controls, returns, and reports.'
  },
  servers: [
    {
      url: '/api',
      description: 'API base path'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@demo.com' },
          password: { type: 'string', example: 'Admin@123' }
        }
      },
      Product: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          sku: { type: 'string', example: 'BEV-ORG-001' },
          name: { type: 'string', example: 'Organic Cold Brew Coffee' },
          category: { type: 'string', example: 'Beverages' },
          purchasePrice: { type: 'number', example: 2.20 },
          sellingPrice: { type: 'number', example: 4.50 },
          stock: { type: 'integer', example: 45 },
          reorderLevel: { type: 'integer', example: 10 },
          isActive: { type: 'boolean', example: true }
        }
      },
      SaleItem: {
        type: 'object',
        required: ['productId', 'quantity'],
        properties: {
          productId: { type: 'string', example: '652f1e28b8a92b34a1b8c9d0' },
          quantity: { type: 'integer', example: 2 }
        }
      },
      CreateSaleRequest: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/SaleItem' }
          },
          discountType: {
            type: 'string',
            enum: ['percentage', 'fixed', 'none'],
            example: 'percentage'
          },
          discountValue: { type: 'number', example: 10 },
          taxRate: { type: 'number', example: 5 }
        }
      },
      StockAdjustmentRequest: {
        type: 'object',
        required: ['productId', 'type', 'quantity', 'reason'],
        properties: {
          productId: { type: 'string' },
          type: { type: 'string', enum: ['received', 'add', 'remove'] },
          quantity: { type: 'integer', example: 10 },
          reason: { type: 'string', example: 'Restock shipment received' },
          reference: { type: 'string', example: 'PO-2026-904' }
        }
      },
      ReturnRequest: {
        type: 'object',
        required: ['items', 'reason'],
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                quantity: { type: 'integer', example: 1 }
              }
            }
          },
          reason: { type: 'string', example: 'Customer purchased incorrect roast' }
        }
      }
    }
  },
  security: [{ BearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        summary: 'Authenticate user and get JWT token',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } }
        },
        responses: {
          200: { description: 'Authenticated successfully' },
          401: { description: 'Invalid credentials' }
        }
      }
    },
    '/auth/me': {
      get: {
        summary: 'Get current authenticated user profile',
        responses: {
          200: { description: 'Current user profile' },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/products': {
      get: {
        summary: 'List products with filters and pagination',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search by name or SKU' },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'stockStatus', in: 'query', schema: { type: 'string', enum: ['in', 'low', 'out'] } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } }
        ],
        responses: { 200: { description: 'Paginated product list' } }
      },
      post: {
        summary: 'Create product (Admin only)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } }
        },
        responses: { 201: { description: 'Product created' }, 403: { description: 'Forbidden' } }
      }
    },
    '/products/{id}': {
      get: {
        summary: 'Get product by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Product details' }, 404: { description: 'Not found' } }
      },
      put: {
        summary: 'Update product (Admin only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
        responses: { 200: { description: 'Product updated' } }
      }
    },
    '/products/{id}/deactivate': {
      patch: {
        summary: 'Deactivate product (Admin only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Product deactivated' } }
      }
    },
    '/inventory/low-stock': {
      get: {
        summary: 'List active products at or below reorder level',
        responses: { 200: { description: 'Low stock products' } }
      }
    },
    '/inventory/adjustments': {
      post: {
        summary: 'Adjust stock (Staff: received; Admin: received, add, remove)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/StockAdjustmentRequest' } } }
        },
        responses: { 201: { description: 'Stock adjusted' }, 409: { description: 'Insufficient stock or conflict' } }
      }
    },
    '/inventory/movements': {
      get: {
        summary: 'Get audit log of all stock movements',
        parameters: [
          { name: 'product', in: 'query', schema: { type: 'string' } },
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'from', in: 'query', schema: { type: 'string' } },
          { name: 'to', in: 'query', schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Audit movements' } }
      }
    },
    '/sales': {
      get: {
        summary: 'List sales with date filter and pagination',
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string' } },
          { name: 'to', in: 'query', schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Sales list' } }
      },
      post: {
        summary: 'Create atomic sale and update inventory',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateSaleRequest' } } }
        },
        responses: { 201: { description: 'Sale processed' }, 409: { description: 'Insufficient stock' } }
      }
    },
    '/sales/{id}': {
      get: {
        summary: 'Get sale details, invoice snapshot, and return records',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Sale details' }, 404: { description: 'Sale not found' } }
      }
    },
    '/sales/{id}/returns': {
      post: {
        summary: 'Process sale return, restore stock, and record audit log (Admin only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ReturnRequest' } } }
        },
        responses: { 201: { description: 'Return approved and processed' } }
      }
    },
    '/reports/sales': {
      get: {
        summary: 'Get aggregate sales report, top products, daily breakdown',
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string' } },
          { name: 'to', in: 'query', schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Sales metrics' } }
      }
    },
    '/reports/sales/export': {
      get: {
        summary: 'Export sales report as CSV download',
        responses: { 200: { description: 'CSV file download' } }
      }
    },
    '/reports/profit': {
      get: {
        summary: 'Calculate gross & net profit after discounts and returns (Admin only)',
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string' } },
          { name: 'to', in: 'query', schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Profit report' }, 403: { description: 'Forbidden' } }
      }
    }
  }
};
