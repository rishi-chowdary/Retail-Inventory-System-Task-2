import { z } from 'zod';

export const dateRangeQuerySchema = {
  query: z.object({
    from: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    to: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional()
  })
};
