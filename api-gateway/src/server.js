import dotenv from 'dotenv'
import express from 'express'
import logger from './utils/logger.js'
import cors from "cors";
import Redis from "ioredis";
import helemt from "helmet";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import proxy from "express-http-proxy";
import ApiError from './errors/customAPIError.js';
import errorHandler from './middleware/errorHandler.js'
dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

const redisClient = new Redis(process.env.REDIS_URL)

app.use(express.urlencoded({extended: true}))
app.use(express.json())
app.use(helemt())
app.use(cors())

const rateLimitOptions =  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true, // allowing headers in response
    legacyHeaders: false,
    handler: (req,res)=>{
          logger.warn(`Rate limit exceded for ip ${req.ip}`)
          throw new ApiError(429,`Rate limit exceded for ip ${req.ip}`)
    },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
})

app.use(rateLimitOptions)

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error: ${err.message}`);
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  },
};

app.use(
  "/v1/auth",
  proxy(process.env.USER_SERVICE, {
    ...proxyOptions,
    // override most request options before issuing the proxyRequest
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      return proxyReqOpts;
    },
    //modify the proxy's response before sending it to the client.
    userResDecorator: (proxyRes, proxyResData) => {
      logger.info(
        `Response received from Identity service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

app.use(errorHandler)

app.listen(PORT, ()=> {
    logger.info(`api-gateway running on port ${PORT}`)
    logger.info(`user service running on port ${process.env.USER_SERVICE}`)
})