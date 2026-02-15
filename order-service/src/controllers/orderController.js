import Order from "../models/Order.js";
import logger from "../utils/logger.js";
import ApiError from "../errors/customAPIError.js";
import checkPermission from "../utils/checkPermission.js";
import rabbitmq from "../utils/rabbitmq.js";
import axios from "axios";

export const createOrder = async (req, res) => {
  logger.info("createOrder API endpoint hit");
  try {
    const { items: cartItems, tax, shippingFee, shippingAddress } = req.body;

    if (!cartItems || cartItems.length < 1) {
      throw new ApiError(400, "No cart items provided");
    }
    if (!tax || !shippingFee) {
      throw new ApiError(400, "Please provide tax and shipping fee");
    }
    if (!shippingAddress) {
      throw new ApiError(400, "Please provide shipping address");
    }

    let orderItems = [];
    let subtotal = 0;

    for (const item of cartItems) {
      try {
        const productResponse = await axios.get(
          `${process.env.PRODUCT_SERVICE_URL}/api/product/${item.productId}`,
          {
            timeout: 5000,
          },
        );

        const product = productResponse.data.product;

        if (!product) {
          throw new ApiError(
            404,
            `Product does not exist with id ${item.productId}`,
          );
        }

        if (product.inventory < item.amount) {
          throw new ApiError(
            400,
            `Insufficient inventory for ${product.name}. Available: ${product.inventory}`,
          );
        }

        const { name, price, image } = product;

        const singleOrderItem = {
          amount: item.amount,
          name,
          price,
          image,
          productId: item.productId,
        };

        orderItems = [...orderItems, singleOrderItem];
        subtotal += item.amount * price;
      } catch (error) {
        if (error.response?.status === 404) {
          throw new ApiError(
            404,
            `Product does not exist with id ${item.productId}`,
          );
        }

        if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
          throw new ApiError(
            503,
            "Product Service is currently unavailable. Please try again later.",
          );
        }
        throw error;
      }
    }

    const total = tax + shippingFee + subtotal;

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

    try {
      await rabbitmq.publishEvent("order.created", {
        orderId: order._id.toString(),
        userId: order.userId.toString(),
        total: order.total,
        subtotal: order.subtotal,
        tax: order.tax,
        shippingFee: order.shippingFee,
        currency: "inr",
        // Convert order items to plain objects (remove Mongoose metadata)
        items: order.orderItems.map((item) => ({
          productId: item.productId.toString(),
          amount: item.amount,
          price: item.price,
          name: item.name,
          image: item.image || "",
        })),
        // Convert shipping address to plain object
        shippingAddress: {
          street: order.shippingAddress.street,
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          pinCode: order.shippingAddress.pinCode,
          country: order.shippingAddress.country,
        },
      });

      logger.info(`Order created event published for order: ${order._id}`);
    } catch (error) {
      logger.error("Failed to publish order.created event:", error);
    }

    try {
      const checkoutResponse = await axios.post(
        `${process.env.PAYMENT_SERVICE_URL}/api/checkout/create-session`,
        {
          orderId: order._id.toString(),
          orderItems: order.orderItems.map((item) => ({
            productId: item.productId.toString(),
            amount: item.amount,
            price: item.price,
            name: item.name,
            image: item.image || "",
          })),
          total: order.total,
          shippingAddress: {
            street: order.shippingAddress.street,
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
            pinCode: order.shippingAddress.pinCode,
            country: order.shippingAddress.country,
          },
        },
        {
          headers: {
          'x-user-id': req.user.userId,
          'x-user-role': req.user.role,
          'Content-Type': 'application/json',
        },
          timeout: 5000,
        },
      );
console.log("this is response",checkoutResponse)
      return res.status(201).json({
        success: true,
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
        checkout: {
          sessionId: checkoutResponse.data.sessionId,
          checkoutUrl: checkoutResponse.data.checkoutUrl,
        },
        message: "Order created successfully. Proceed to payment.",
      });
    } catch (error) {
      logger.error("Failed to create checkout session:", error);

      // Order created but checkout failed - return order anyway
      return res.status(201).json({
        success: true,
        order: {
          _id: order._id,
          status: order.status,
          paymentStatus: order.paymentStatus,
        },
        message:
          "Order created but payment initialization failed. Please try again.",
      });
    }
  } catch (error) {
    logger.error("An error occured while creating an order");

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

export const getAllOrders = async (req, res) => {
  try {
    const order = await Order.find({}).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      order,
      count: order.length,
    });
  } catch (error) {
    logger.error("Error fetching all orders", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

export const getSingleOrder = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) {
      logger.warn("Order does not exist");
      throw new ApiError(404, "Order does not exist");
    }

    checkPermission(req.user, order.userId);

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error fetching order:", error);

    if (error instanceof ApiError) {
      throw error;
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
    });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { id: orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      logger.warn("Order not found");
      throw new ApiError(404, `Order with id ${orderId} does not exist`);
    }

    checkPermission(req.user, order.userId);

    if (!["pending", "confirmed"].includes(order.status)) {
      throw new ApiError(
        401,
        `Cannot cancel order with status: ${order.status}`,
      );
    }

    order.status = "cancelled";
    order.cancelledAt = new Date();
    await order.save();

    await rabbitmq.publish("order.cancelled", {
      orderId: order._id.toString(),
      userId: order.userId,
      reason: "Cancelled by user",
    });

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    console.error("Error cancelling order:", error);

    if (error instanceof ApiError) {
      throw error;
    }

    res.status(500).json({
      success: false,
      message: "Failed to cancel order",
    });
  }
};

export const getOrderStats = async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$total" },
        },
      },
    ]);

    const totalOrders = await Order.countDocuments();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentOrders = await Order.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    res.status(200).json({
      success: true,
      stats: {
        total: totalOrders,
        recent: recentOrders,
        byStatus: stats,
      },
    });
  } catch (error) {
    console.error("Error fetching order stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order statistics",
    });
  }
};
