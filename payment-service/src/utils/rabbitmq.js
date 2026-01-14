import amqp from "amqplib";
import logger from "./logger.js";

const EXCHANGE_NAME = "order_events";
const EXCHANGE_TYPE = "topic";
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
let connection = null;
let channel = null;

export async function connect() {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
      durable: true,
    });
    logger.info("Connected to Rabbitmq");

    // Handle connection errors
    connection.on("error", (err) => {
      console.error(" RabbitMQ connection error:", err);
      setTimeout(connect, 5000);
    });

    connection.on("close", () => {
      console.log("RabbitMQ connection closed. Reconnecting...");
      setTimeout(connect, 5000);
    });
  } catch (error) {
    logger.error("Error connecting to Rabbitmq", error);
    setTimeout(connect, 5000);
  }
}

export async function publishEvent(routingKey, message) {
try {
      if (!channel) {
        await connect();
      }
      await publishEvent(
        EXCHANGE_NAME,
        routingKey,
        Buffer.from(JSON.stringify(message))
      );
      logger.info(`Event published: ${routingKey}`);
} catch (error) {
    logger.error('Failed to publish message:', error);
    throw error;
}
}

export async function subscribeEvent(routingKey, callback) {
try {
      if (!channel) {
        await connect();
      }
    
      const serviceName = process.env.EXCHANGE_NAME || "order_events";
      const queue = `${serviceName}_${routingKey}`;
    
      await channel.assertQueue(queue, { durable: true });
      await channel.bindQueue(queue, EXCHANGE_NAME, routingKey);
    
      channel.consume(queue, async (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            await callback(content);
            await channel.ack(msg);
          } catch (error) {
            logger.error("Error processing message: ", error);
            channel.nack(msg, false, true);
          }
        }
       logger.info(`Subscribed to event: ${routingKey}`)
      });
} catch (error) {
    logger.error('Failed to subscribe:', error);
    throw error;
}
}

async function close() {
  try {
    await channel?.close();
    await connection?.close();
    console.log('RabbitMQ connection closed');
  } catch (error) {
    console.error('*Error closing connection:', error);
  }
}

// Export functions
export default {
  connect,
  publishEvent,
  subscribeEvent,
  close,
  EXCHANGE_NAME
};
