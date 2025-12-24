import { cancelOrder, createOrder, getAllOrders, getOrderStats, getSingleOrder } from "../controllers/orderController.js"
import authenticate from '../middleware/authMiddleware.js'
import {authorizeRoles}  from "../middleware/authorization.js"
import {Router} from 'express'

const router = Router()

router.post('/createOrder',authenticate,createOrder)

router.get('/:id',authenticate,getSingleOrder)
router.patch('/:id/cancel',authenticate,cancelOrder)

router.get('/',authenticate,authorizeRoles('admin'),getAllOrders)
router.get('/stats',authenticate,authorizeRoles('admin',getOrderStats))

export default router

