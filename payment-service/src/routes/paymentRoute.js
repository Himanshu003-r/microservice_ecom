import express from 'express'
import {getPaymentByOrder,getPaymentStatus} from '../controllers/paymentController.js'
import authenticate from '../middleware/verifyGateway.js'




const router = express.Router()

router.get('/order/:orderId',authenticate,getPaymentByOrder)
router.get('/:id',authenticate,getPaymentStatus)
router.get('/stats',authenticate,authorizeRoles('admin',getOrderStats))

export default router

