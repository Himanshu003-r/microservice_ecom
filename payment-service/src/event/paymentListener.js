import Payment from "../models/Payment.js";
import logger from "../utils/logger.js";
import rabbitmq from "../utils/rabbitmq.js";
import stripe from "../utils/stripe.js";

const setUpOrderListener = async () => {
  await rabbitmq.subscribeEvent("order.created", async (message) => {
    const { orderId, userId, total, currency } = message;

    try {
      const existingPayment = await Payment.findById({ orderId });
      if (existingPayment) {
        logger.info("Payment already exists for order:", orderId);
        return;
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100), // converted to paisa
        currency: currency || "inr",
        metadata: { orderId, userId },
      });

      const payment = await Payment.create({
        orderId,
        userId,
        amount: total,
        currency: currency || "inr",
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: "pending",
      });

      logger.info("Payment created", payment._id);

      await rabbitmq.publishEvent("payment.initiated", {
        orderId,
        paymentId: payment._id.toString(),
        paymentIntent: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error) {
      logger.error("Error processing in payment", error);
      throw error;
    }
  });

  await rabbitmq.subscribeEvent("order.cancelled", async (message) => {
    const { orderId } = message;

    try {
      const payment = await Payment.findById({ orderId });

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
      throw error;
    }
  });
};

export default setUpOrderListener;
