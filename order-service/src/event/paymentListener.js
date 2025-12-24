import Order from "../models/Order.js";
import logger from "../utils/logger.js";
import rabbitmq from "../utils/rabbit.js";

const setUpPaymentListener = async () => {
  await rabbitmq.subscribeEvent("payment.completed", async (message) => {
    const { orderId, paymentId, status } = message;

    try {
      const order = await Order.findById(orderId);

      if (!order) {
        logger.error(`Order not found: ${orderId}`);
        return;
      }

      order.paymentId = paymentId;
      order.status = status;
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
    const { orderId, reason } = message;

    try {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: "failed",
        status: "cancelled",
        cancelledAt: new Date(),
      });

      logger.info(`Order ${orderId} cancelled due to payment failure`);
    } catch (error) {
      logger.error("Error processing payment.failed event:", error);
      throw error;
    }
  });
};
// add payment initiated 
export default setUpPaymentListener