import { loginUser, logoutUser, refreshTokenUser, registerUser } from "../controllers/userAuth.js"
import {Router} from 'express'

const router = Router()

router.post('/register',registerUser)
router.post('/login',loginUser)
router.post('/logout',logoutUser)
router.post('/refreshToken',refreshTokenUser)

export default router

