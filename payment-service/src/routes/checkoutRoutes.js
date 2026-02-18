import {Router} from 'express'
import {checkoutSession} from '../controllers/checkoutController.js'
import verifyGateway from '../middleware/verifyGateway.js'
const router = Router()

router.post('/create-session', verifyGateway,checkoutSession)

export default router