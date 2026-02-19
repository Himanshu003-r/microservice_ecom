import express from 'express'
import {Router} from 'express'
import { webhooks } from "../controllers/paymentController.js";

const router = Router()

router.post("/stripe", express.raw({ type: 'application/json' }), webhooks);

export default router;
