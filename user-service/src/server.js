import dotenv from "dotenv";
import express from "express";
import connectDB from "./db/dbConnect.js";
import logger from "./utils/logger.js";
import errorHandler from "./middleware/errorHandler.js";
import helmet from "helmet";
import cors from "cors";
import authRoute from "./routes/authRoute.js";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import Redis from "ioredis";
import ApiError from "./errors/customAPIError.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT | 4001;
const redisClient = new Redis(process.env.REDIS_URL);
connectDB();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded());
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info("Request body,", req.body);
  next();
});

//DDOS proc and rate limiting
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10, // max no. of requests
  duration: 1, // in sec
});

app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: "Too many requests",
      });
    });
});

//IP based rate limiting for sensitive endpoints
const WINDOW_MS = 15 * 60 * 1000; // 15 mins
const sensitiveEndpoints = rateLimit({
  windowMs: WINDOW_MS,
  max:  7,
  standardHeaders: true, // allowing headers in response
  legacyHeaders: false,
  handler: (req, res) => {
    const windowMinutes = Math.floor(WINDOW_MS / 60000);
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    throw new ApiError(429, `Too many requests, try again after ${windowMinutes} minutes `);
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

//apply the sensitive rate limiter to routes
app.use("/api/auth/register", authRoute)//,sensitiveEndpoints);
app.use("/api/auth/login", authRoute)//, sensitiveEndpoints);
app.use("/api/auth", authRoute);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use(errorHandler);

app.listen(PORT, console.log(`Server  running on port ${PORT}`));

//Unhandled promise rejection
process.on('unhandledRejection', (reason,promise) => {
    logger.error('Unhandled rejection at ', promise, ' reason', reason)
})
