import { z } from 'zod';

export const createProductSchema = {
  body: z.object({
    sku: z.string().min(2, 'SKU must be at least 2 characters').max(30),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    category: z.string().min(2, 'Category is required').max(50),
    purchasePrice: z.number().min(0, 'Purchase price cannot be negative'),
    sellingPrice: z.number().min(0, 'Selling price cannot be negative'),
    stock: z.number().int('Stock must be an integer').min(0, 'Initial stock cannot be negative').default(0),
    reorderLevel: z.number().int('Reorder level must be an integer').min(0).default(5)
  })
};

export const updateProductSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID')
  }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    category: z.string().min(2).max(50).optional(),
    purchasePrice: z.number().min(0).optional(),
    sellingPrice: z.number().min(0).optional(),
    reorderLevel: z.number().int().min(0).optional(),
    isActive: z.boolean().optional()
  })
};

export const queryProductsSchema = {
  query: z.object({
    q: z.string().optional(),
    category: z.string().optional(),
    stockStatus: z.enum(['in', 'low', 'out']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional()
  })
};

export const productIdParamSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID')
  })
};
