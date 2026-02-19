import dotenv from "dotenv";
import express from "express";
import connectDB from "./db/dbConnect.js";
import logger from "./utils/logger.js";
import errorHandler from "./middleware/errorHandler.js";
import helmet from "helmet";
import cors from "cors";
import paymentRoute from "./routes/paymentRoute.js";
import checkoutRoutes from "./routes/checkoutRoutes.js"
import webhookRoutes from './routes/webhookRoutes.js'
import { connect } from "./utils/rabbitmq.js";
import Redis from "ioredis";
import setUpOrderListener from "./event/orderListener.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT | 4003;
const redisClient = new Redis(process.env.REDIS_URL);
connectDB();

app.use(helmet());
app.use(cors());
app.use('/api/webhook', webhookRoutes);
app.use(express.json());
app.use(express.urlencoded());
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info("Request body,", req.body);
  next();
});

app.use("/api/payment", paymentRoute);
app.use("/api/checkout",checkoutRoutes)

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use(errorHandler);

async function startServer() {
  try {
    await connect();

    // consume the event
    await setUpOrderListener();

    app.listen(PORT, () => {
      logger.info(`Payment service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start payment service", error);
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await rabbitmq.close();
  await mongoose.connection.close();
  process.exit(0);
});

startServer();

//Unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection at ", promise, " reason", reason);
});
