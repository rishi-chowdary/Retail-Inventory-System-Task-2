import { Router } from 'express';
import {
  handleCreateSale,
  handleGetSales,
  handleGetSaleById,
  handleSaleReturn
} from '../controllers/sale.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { validateRequest } from '../middleware/validate';
import {
  createSaleSchema,
  querySalesSchema,
  saleIdParamSchema,
  createReturnSchema
} from '../validators/sale.validator';

const router = Router();

router.use(authenticate);

router.post('/', validateRequest(createSaleSchema), handleCreateSale);
router.get('/', validateRequest(querySalesSchema), handleGetSales);
router.get('/:id', validateRequest(saleIdParamSchema), handleGetSaleById);
router.post(
  '/:id/returns',
  requireRole('Admin'),
  validateRequest(createReturnSchema),
  handleSaleReturn
);

export default router;
