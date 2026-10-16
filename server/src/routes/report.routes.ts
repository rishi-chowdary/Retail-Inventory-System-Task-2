import { Router } from 'express';
import {
  handleSalesReport,
  handleExportSalesCsv,
  handleProfitReport
} from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { validateRequest } from '../middleware/validate';
import { dateRangeQuerySchema } from '../validators/report.validator';

const router = Router();

router.use(authenticate);

router.get('/sales', validateRequest(dateRangeQuerySchema), handleSalesReport);
router.get('/sales/export', validateRequest(dateRangeQuerySchema), handleExportSalesCsv);
router.get(
  '/profit',
  requireRole('Admin'),
  validateRequest(dateRangeQuerySchema),
  handleProfitReport
);

export default router;
