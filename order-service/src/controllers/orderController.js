import Order from "../models/Order.js";
import logger from "../utils/logger.js";
import ApiError from "../errors/customAPIError.js";
export const createOrder = async (req, res) => {
    logger.info('createOrder API endpoint hit')
  try {
    const { items: cartItems, tax, shippingFee, shippingAddress } = req.body;
    
    if (!cartItems || cartItems.length < 1) {
      throw new ApiError(400,"No cart items provided")
    }
    if (!tax || !shippingFee) {
      throw new ApiError(400,"Please provide tax and shipping fee")
    }
    if (!shippingAddress) {
      throw new ApiError(400,"Please provide shipping address")
    }

    let orderItems = [];
    let subtotal = 0;

    // Validate products by calling Product Service API
    for (const item of cartItems) {
      try {
        // Call Product Service to get product details
        const productResponse = await axios.get(
          `${process.env.PRODUCT_SERVICE_URL}/api/v1/products/${item.productId}`,
          {
            timeout: 5000,
          }
        );

        const product = productResponse.data.product;

        if (!product) {
          throw new ApiError(404,`Product does not exist with id ${item.productId}`)
        }

        // Check inventory availability
        if (product.inventory < item.amount) {
          throw new ApiError(400,`Insufficient inventory for ${product.name}. Available: ${product.inventory}`)
        }

        const { name, price, image } = product;

        const singleOrderItem = {
          amount: item.amount,
          name,
          price,
          image,
          productId: item.productId, // Store as string, not ObjectId
        };

        orderItems = [...orderItems, singleOrderItem];
        subtotal += item.amount * price;
      } catch (error) {
        if (error.response?.status === 404) {
          throw new CustomErrors.NotFoundError(
            `Product does not exist with id ${item.productId}`
          );
        }
        // Handle Product Service downtime
        if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
          throw new CustomErrors.ServiceUnavailableError(
            "Product Service is currently unavailable. Please try again later."
          );
        }
        throw error;
      }
    }

    // Calculate total
    const total = tax + shippingFee + subtotal;

    // Create order in database with pending status
    const order = await Order.create({
      orderItems,
      total,
      subtotal,
      tax,
      shippingFee,
      shippingAddress,
      userId: req.user.userId,
      status: "pending",
      paymentStatus: "pending",
    });

    // Publish order.created event to RabbitMQ
    try {
      await rabbitmq.publish("order.created", {
        orderId: order._id.toString(),
        userId: order.userId,
        total: order.total,
        currency: "inr",
        items: order.orderItems.map((item) => ({
          productId: item.productId,
          amount: item.amount,
          price: item.price,
        })),
        shippingAddress: order.shippingAddress,
      });

      console.log(`Order created event published for order: ${order._id}`);
    } catch (error) {
      console.error("Failed to publish order.created event:", error);

      // You might want to implement a retry mechanism or dead letter queue
      // For now, we'll let the order exist and handle it via polling/retry logic
    }
    res.status(201).json({
      order: {
        _id: order._id,
        orderItems: order.orderItems,
        total: order.total,
        subtotal: order.subtotal,
        tax: order.tax,
        shippingFee: order.shippingFee,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      },
      message: "Order created successfully. Processing payment...",
    });
  } catch (error) {
      logger.error("An error occured while creating an order");

    // Handle custom errors
    if (error instanceof ApiError) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
      });
    }

    // Handle other errors
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
