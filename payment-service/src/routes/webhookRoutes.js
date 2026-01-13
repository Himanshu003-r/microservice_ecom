import express from "express";
import { webhooks } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/stipe", express.raw({ type: 'application/json' }), webhooks);

export default router;
