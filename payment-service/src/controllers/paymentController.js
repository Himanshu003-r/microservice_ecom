import Payment from "../models/Payment.js";
import stripe from "../utils/stripe.js";
import logger from "../utils/logger.js";
import rabbitmq from "../utils/rabbitmq.js";
import ApiError from "../errors/customAPIError.js";

export const webhooks = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    logger.error("Webhook error", error.message);
    return res.status(400).send("Webhook error");
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;

    const payment = await Payment.findOne({
      paymentIntentId: paymentIntent.id,
    });

    if (payment && payment.status !== "succeeded") {
      (payment.status = "succeeded"),
        (payment.transactionId = paymentIntent.id),
        (payment.succeededAt = new Date());
    }

    if (paymentIntent.payment_method) {
      const paymentMethod = stripe.paymentMethods.retrieve(
        paymentIntent.payment_method
      );
      payment.paymentMethod = {
        type: pm.type,
        last4: pm.card?.last4,
        brand: pm.card?.brand,
      };
    }

    await payment.save();

    logger.log("Payment succeded", payment._id);

    await rabbitmq.publishEvent("payment.completed", {
      orderId: payment.orderId,
      paymentId: payment._id.toString(),
      transactionId: payment.transactionId,
      status: "succeeded",
    });
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object;

    const payment = await Payment.findOne({
      paymentIntentId: paymentIntent.id,
    });

    if (payment) {
      payment.status = "failed";
      payment.failureCode = paymentIntent.last_payment_error?.code;
      payment.failureMessage = paymentIntent.last_payment_error?.message;
      payment.failedAt = new Date();
    }

    await payment.save();

    logger.info("Payment failure", payment._id);

    await rabbitmq.publishEvent("payment.failed", {
      orderId: payment.orderId,
      reason: payment.failureMessage,
      status: "failed",
    });
  }
  res.json({ received: true });
};

export const getPaymentByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const payment = await Payment.findById({ orderId });

    if (!payment) {
      logger.error(`Payment not found with order ${orderId}`);
      throw new ApiError(404, `Payment not found for order ${orderId}`);
    }

    if (req.user.userId !== payment.userId && req.user.role !== "admin") {
      throw new ApiError(403, "Not authorized to view payments");
    }

    res.status(200).json({
      success: true,
      payment: {
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        createdAt: payment.createdAt,
        succeededAt: payment.succeededAt,
        failedAt: payment.failedAt,
        failureMessage: payment.failureMessage,
      },
    });
  } catch (error) {
    logger.error("Error fetching payment");

    if (error instanceof ApiError) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
      });
    }

    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await Payment.findById(id);
    
    if (!payment) {
      throw new ApiError(404, 'Payment not found')
    }
    
    // Check permissions
    if (req.user.userId !== payment.userId && req.user.role !== 'admin') {
       throw new ApiError(403, 'Not authorized')
    }
    
    res.status(200).json({
      success: true,
      payment: {
        id: payment._id,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        createdAt: payment.createdAt,
        succeededAt: payment.succeededAt
      }
    });
    
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

