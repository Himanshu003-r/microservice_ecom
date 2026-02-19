import {Router} from 'express'
import {getPaymentByOrder,getPaymentStatus} from '../controllers/paymentController.js'
import authenticate from '../middleware/verifyGateway.js'

const router = Router()

router.get('/order/:orderId',authenticate,getPaymentByOrder)
router.get('/:id',authenticate,getPaymentStatus)

export default router

