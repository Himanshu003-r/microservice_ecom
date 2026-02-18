import Payment from "../models/Payment.js";
import logger from "../utils/logger.js";
import rabbitmq from "../utils/rabbitmq.js";
import stripe from "../utils/stripe.js";

const setUpOrderListener = async () => {
  await rabbitmq.subscribeEvent("order.created", async (message) => {
    const { orderId} = message;
    try {
      logger.info(`Order created event received for order: ${orderId}`);
    } catch (error) {
      logger.error("Error processing order.created event:", error);
    }
  });

  await rabbitmq.subscribeEvent("order.cancelled", async (message) => {
    const { orderId } = message;

    try {
      const payment = await Payment.findOne({ orderId: orderId });

      if (!payment) {
        logger.info(`Payment does not exist for order: ${orderId}`);
        return;
      }

      if (payment.status === "succeeded") {
        const refund = await stripe.refunds.create({
          payment_intent: payment.paymentIntentId,
        });
      }

      payment.status = "refunded";
      payment.refundId = refund.id;
      payment.refundAmount = payment.amount;
      payment.refundReason = "Order cancelled";
      payment.refundedAt = new Date();
      await payment.save();

      logger.info("Payment cancelled", payment._id);

      await rabbitmq.publishEvent("payment.refunded", {
        orderId,
        refundId: refund.id,
        amount: payment.amount,
      });
    } catch (error) {
      logger.error("Error processing in refund", error);
    }
  });
};

export default setUpOrderListener;
