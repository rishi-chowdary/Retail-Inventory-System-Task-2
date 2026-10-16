import { z } from 'zod';

export const stockAdjustmentSchema = {
  body: z.object({
    productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
    type: z.enum(['received', 'add', 'remove']),
    quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1'),
    reason: z.string().min(2, 'Reason must be at least 2 characters').max(200),
    reference: z.string().max(100).optional()
  })
};

export const queryMovementsSchema = {
  query: z.object({
    product: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID').optional(),
    type: z.enum(['RECEIVED', 'SALE', 'ADJUSTMENT_ADD', 'ADJUSTMENT_REMOVE', 'RETURN']).optional(),
    from: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    to: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional()
  })
};
