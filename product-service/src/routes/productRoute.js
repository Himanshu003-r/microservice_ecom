import express from 'express';
import {
  getAllProducts,
  getSingleProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateInventory
} from '../controllers/productController.js';
import verifyGateway  from '../middleware/verifyGateway.js';
import { authorizeRoles } from '../middleware/authorization.js';

const router = express.Router();

router.get('/', getAllProducts);
router.get('/:id', getSingleProduct);

router.post(
  '/',
  verifyGateway,
  authorizeRoles('admin'),
  createProduct
);

router.put(
  '/:id',
  verifyGateway,
  authorizeRoles('admin'),
  updateProduct
);

router.delete(
  '/:id',
  verifyGateway,
  authorizeRoles('admin'),
  deleteProduct
);

router.patch(
  '/inventory/update',
  verifyGateway,
  updateInventory
);

export default router;


