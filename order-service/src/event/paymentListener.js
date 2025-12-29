import Order from "../models/Order.js";
import logger from "../utils/logger.js";
import rabbitmq from "../utils/rabbitmq.js";

const setUpPaymentListener = async () => {
  await rabbitmq.subscribeEvent("payment.initiated", async (message) => {
    const { orderId, paymentId, clientSecret, paymentIntentId } = message;

    try {
      if (!orderId || !paymentId || !clientSecret) {
        logger.warn("Invalid payment initialization", message);
        return;
      }

      const order = await Order.findById(orderId);

      if (!order) {
        logger.error(`Order for id ${orderId} does not exist`);
        return;
      }

      if (order.paymentId) {
        logger.info(`Payment already initiated for order ${orderId}`);
        return;
      }

      order.paymentId = paymentId;
      order.clientSecret = clientSecret;
      order.paymentIntentId = paymentIntentId;
      order.paymentStatus = "pending";

      await order.save();

      logger.info(`Payment initiated for order ${orderId}`);
    } catch (error) {
      logger.error("Error processing payment.initiated event:", error);
      throw error;
    }
  });

  await rabbitmq.subscribeEvent("payment.completed", async (message) => {
    const { orderId, paymentId, transactionId } = message;

    try {
      if (!orderId || !paymentId) {
        logger.warn("Invalid payment.completed event", message);
        return;
      }

      const order = await Order.findById(orderId);

      if (!order) {
        logger.error(`Order not found: ${orderId}`);
        return;
      }

      if (order.paymentStatus === "completed") {
        logger.info(`Order ${orderId} already confirmed`);
        return;
      }

      order.paymentId = paymentId;
      order.transactionId = transactionId;
      order.status = "confirmed";
      order.paymentStatus = "completed";
      order.confirmedAt = new Date();

      await order.save();

      logger.info(`Order ${orderId} confirmed after successful payment`);
    } catch (error) {
      logger.error("Error processing payment.completed event:", error);
      throw error;
    }
  });

  await rabbitmq.subscribeEvent("payment.failed", async (message) => {
    const { orderId, reason, failureCode } = message;

    try {
      if (!orderId) {
        logger.warn("Invalid payment.failed event", message);
        return;
      }

      const order = await Order.findById(orderId);

      if (!order) {
        logger.error(`Order not found: ${orderId}`);
        return;
      }

      order.paymentStatus = "failed";
      order.status = "cancelled";
      order.cancelledAt = new Date();
      order.failureCode = failureCode;
      order.failureReason = reason;

      await order.save();

      logger.info(`Order ${orderId} cancelled due to payment failure`);
    } catch (error) {
      logger.error("Error processing payment.failed event:", error);
      throw error;
    }
  });
};

export default setUpPaymentListener;
