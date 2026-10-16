import { Router } from 'express';
import {
  getLowStock,
  createAdjustment,
  listMovements
} from '../controllers/inventory.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import {
  stockAdjustmentSchema,
  queryMovementsSchema
} from '../validators/inventory.validator';

const router = Router();

router.use(authenticate);

router.get('/low-stock', getLowStock);
router.post('/adjustments', validateRequest(stockAdjustmentSchema), createAdjustment);
router.get('/movements', validateRequest(queryMovementsSchema), listMovements);

export default router;
