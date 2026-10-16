import { z } from 'zod';

export const createSaleSchema = {
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
          quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1')
        })
      )
      .min(1, 'At least one item is required in a sale'),
    discountType: z.enum(['percentage', 'fixed', 'none']).default('none'),
    discountValue: z.number().min(0, 'Discount value cannot be negative').default(0),
    taxRate: z.number().min(0, 'Tax rate cannot be negative').default(0)
  })
};

export const querySalesSchema = {
  query: z.object({
    from: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    to: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    status: z.enum(['Completed', 'PartiallyReturned', 'Returned']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional()
  })
};

export const saleIdParamSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid sale ID')
  })
};

export const createReturnSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid sale ID')
  }),
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
          quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1')
        })
      )
      .min(1, 'At least one item must be returned'),
    reason: z.string().min(2, 'Return reason must be at least 2 characters').max(200)
  })
};
