import {Router} from 'express'
import {getPaymentByOrder,getPaymentStatus} from '../controllers/paymentController.js'
import authenticate from '../middleware/verifyGateway.js'
import {authorizeRoles} from '../middleware/authorization.js'



const router = Router()

router.get('/order/:orderId',authenticate,getPaymentByOrder)
router.get('/:id',authenticate,getPaymentStatus)
// router.get('/stats',authenticate,authorizeRoles('admin'),getOrderStats)

export default router

