import Stripe from "stripe";
import Payment from "../models/Payment.js";
import logger from "../utils/logger.js";
import ApiError from "../errors/customAPIError.js";
import rabbitmq from "../utils/rabbitmq.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const checkoutSession = async (req, res) => {
  try {
    const { orderId, orderItems, total, shippingAddress } = req.body;

    if (!orderId || !orderItems || !total) {
      throw new ApiError(404, "OrderId, order items and total required");
    }
    // Checking if user is authenticated
    if (!req.user || !req.user.userId) {
      throw new ApiError(401, "User not authenticated");
    }

    const lineItems = orderItems.map((item) => ({
      price_data: {
        currency: "inr",
        product_data: {
          name: item.name,
          images: item.image ? [item.image] : [],
        },
        unit_amount: Math.round(item.price * 100), // Converted to paise
      },
      quantity: item.amount,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/order/cancel?orderId=${orderId}`,
      metadata: {
        orderId: orderId,
        userId: req.user.userId,
      },
      customer_email: req.user.email,
      shipping_address_collection: {
        allowed_countries: ["IN"],
      },
    });
   

    const payment = await Payment.create({
      orderId,
      userId: req.user.userId,
      amount: total,
      currency: "inr",
      status: "pending",
      paymentIntentId: session.payment_intent,
      checkoutSessionId: session.id,
    });

    await rabbitmq.publishEvent("payment.initiated", {
        orderId,
        paymentId: payment._id.toString(),
        paymentIntentId: payment.paymentIntentId,
      });

    logger.info(
      `Checkout session created: ${session.id} for order: ${orderId}`,
    );

    res.status(200).json({
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url,
      paymentId: payment._id,
    });
  } catch (error) {
    logger.error("Error creating checkout session:", error);

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create checkout session",
    });
  }
};
