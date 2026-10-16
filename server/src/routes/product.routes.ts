import { Router } from 'express';
import {
  listProducts,
  getSingleProduct,
  addProduct,
  editProduct,
  disableProduct
} from '../controllers/product.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { validateRequest } from '../middleware/validate';
import {
  createProductSchema,
  updateProductSchema,
  queryProductsSchema,
  productIdParamSchema
} from '../validators/product.validator';

const router = Router();

router.use(authenticate);

router.get('/', validateRequest(queryProductsSchema), listProducts);
router.get('/:id', validateRequest(productIdParamSchema), getSingleProduct);
router.post(
  '/',
  requireRole('Admin'),
  validateRequest(createProductSchema),
  addProduct
);
router.put(
  '/:id',
  requireRole('Admin'),
  validateRequest(updateProductSchema),
  editProduct
);
router.patch(
  '/:id/deactivate',
  requireRole('Admin'),
  validateRequest(productIdParamSchema),
  disableProduct
);

export default router;
