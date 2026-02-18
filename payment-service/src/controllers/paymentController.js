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
    logger.error("Webhook error:", error.message);
    return res.status(400).send("Webhook error");
  }

  try {
    // Handling  checkout session completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      
      logger.info(`Checkout session completed: ${session.id}`);
      logger.info(`Payment Intent: ${session.payment_intent}`);
      
      const payment = await Payment.findOne({
        checkoutSessionId: session.id,
      });

      if (payment) {
        logger.info(`Old paymentIntentId: ${payment.paymentIntentId}`);
        
        payment.status = "processing";
        payment.paymentIntentId = session.payment_intent;
        await payment.save();

        logger.info(`Updated payment with paymentIntentId: ${session.payment_intent}`);
      } else {
        logger.error(`Payment NOT found for checkoutSessionId: ${session.id}`);
        
        // Listing to all payments to debug
        const allPayments = await Payment.find().limit(5);
        logger.info(`Recent payments in DB:`, allPayments.map(p => ({
          _id: p._id,
          orderId: p.orderId,
          checkoutSessionId: p.checkoutSessionId,
          paymentIntentId: p.paymentIntentId
        })));
      }
    }

    // Handling successful payment
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      
      logger.info(`Payment intent succeeded: ${paymentIntent.id}`);
      
      const payment = await Payment.findOne({
        paymentIntentId: paymentIntent.id,
      });

      if (!payment) {
        logger.error(`Payment NOT found for paymentIntentId: ${paymentIntent.id}`);
        
        // Trying to find by orderId from metadata
        if (paymentIntent.metadata && paymentIntent.metadata.orderId) {
          const paymentByOrder = await Payment.findOne({
            orderId: paymentIntent.metadata.orderId,
          });
          
          if (paymentByOrder) {
            logger.info(`Found payment by orderId: ${paymentByOrder._id}`);

            paymentByOrder.paymentIntentId = paymentIntent.id;
            paymentByOrder.status = "succeeded";
            paymentByOrder.transactionId = paymentIntent.id;
            paymentByOrder.succeededAt = new Date();
            
            if (paymentIntent.payment_method) {
              try {
                const paymentMethod = await stripe.paymentMethods.retrieve(
                  paymentIntent.payment_method
                );
                
                paymentByOrder.paymentMethod = {
                  type: paymentMethod.type,
                  last4: paymentMethod.card?.last4,
                  brand: paymentMethod.card?.brand,
                };
              } catch (error) {
                logger.warn(`Could not retrieve payment method: ${error.message}`);
              }
            }
            
            await paymentByOrder.save();
            logger.info(`Updated payment by orderId`);
            
            try {
              await rabbitmq.publishEvent("payment.completed", {
                orderId: paymentByOrder.orderId,
                paymentId: paymentByOrder._id.toString(),
                transactionId: paymentByOrder.transactionId,
                status: "succeeded",
              });
              
              logger.info(`Published payment.completed event`);
            } catch (error) {
              logger.error(`Failed to publish event: ${error.message}`);
            }
            
            return res.json({ received: true });
          }
        }
        
        logger.error(`Could not find payment by orderId either`);
        return res.json({ received: true });
      }

      if (payment.status === "succeeded") {
        logger.info(`Payment ${payment._id} already succeeded`);
        return res.json({ received: true });
      }

      logger.info(`Found payment: ${payment._id}`);
      
      payment.status = "succeeded";
      payment.transactionId = paymentIntent.id;
      payment.succeededAt = new Date();

      if (paymentIntent.payment_method) {
        try {
          const paymentMethod = await stripe.paymentMethods.retrieve(
            paymentIntent.payment_method
          );
          
          payment.paymentMethod = {
            type: paymentMethod.type,
            last4: paymentMethod.card?.last4,
            brand: paymentMethod.card?.brand,
          };
        } catch (error) {
          logger.warn(`Could not retrieve payment method: ${error.message}`);
        }
      }

      await payment.save();

      logger.info(`Payment succeeded: ${payment._id}`);

      try {
        await rabbitmq.publishEvent("payment.completed", {
          orderId: payment.orderId,
          paymentId: payment._id.toString(),
          transactionId: payment.transactionId,
          status: "succeeded",
        });
        
        logger.info(`Published payment.completed event for order: ${payment.orderId}`);
      } catch (error) {
        logger.error(`Failed to publish event: ${error.message}`);
      }
    }

    // Handling failed payment
    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object;

      const payment = await Payment.findOne({
        paymentIntentId: paymentIntent.id,
      });

      if (!payment) {
        logger.error(`Payment not found for failed payment_intent: ${paymentIntent.id}`);
        return res.json({ received: true });
      }

      payment.status = "failed";
      payment.failureCode = paymentIntent.last_payment_error?.code;
      payment.failureMessage = paymentIntent.last_payment_error?.message;
      payment.failedAt = new Date();

      await payment.save();

      logger.info(`Payment failed: ${payment._id}`);

      try {
        await rabbitmq.publishEvent("payment.failed", {
          orderId: payment.orderId,
          reason: payment.failureMessage,
          status: "failed",
        });
      } catch (error) {
        logger.error(`Failed to publish payment.failed event: ${error.message}`);
      }
    }

    res.json({ received: true });
    
  } catch (error) {
    logger.error("Error processing webhook:", error);
    res.status(200).json({ received: true, error: error.message });
  }
};

export const getPaymentByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const payment = await Payment.findOne({ orderId: orderId });

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
    logger.error("Error fetching payment:", error);

    if (error instanceof ApiError) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
      });
    }

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

