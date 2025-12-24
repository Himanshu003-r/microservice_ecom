import Order from "../models/Order.js";
import logger from "../utils/logger.js";
import ApiError from "../errors/customAPIError.js";
import checkPermission from "../utils/checkPermission.js";

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
          `${process.env.PRODUCT_SERVICE_URL}/api/v1/products/${item.productId}`,
          {
            timeout: 5000,
          }
        );

        const product = productResponse.data.product;

        if (!product) {
          throw new ApiError(
            404,
            `Product does not exist with id ${item.productId}`
          );
        }

        if (product.inventory < item.amount) {
          throw new ApiError(
            400,
            `Insufficient inventory for ${product.name}. Available: ${product.inventory}`
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
          throw new CustomErrors.NotFoundError(
            `Product does not exist with id ${item.productId}`
          );
        }

        if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
          throw new CustomErrors.ServiceUnavailableError(
            "Product Service is currently unavailable. Please try again later."
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
      count: order.length });
} catch (error) {
  logger.error('Error fetching all orders',error)
  res.status(500).json({
    success: false,
      message: 'Failed to fetch orders'
  })
}
};

export const getSingleOrder = async (req,res) => {
  try {
    const {id: orderId} = req.params
    const order = await Order.findById(orderId)

    if (!order){
      logger.warn('Order does not exist')
      throw new ApiError(404, 'Order does not exist')
    }
 
    checkPermission(req.user,order.userId)

    res.status(200).json({
      success: true,
      order
    })
  } catch (error) {
        console.error('Error fetching order:', error);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
}

export const cancelOrder = async (req, res) => {
  try {
    const { id: orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      logger.warn('Order not found')
      throw new ApiError(404,
        `Order with id ${orderId} does not exist`
      );
    }

    checkPermission(req.user, order.userId);

    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new ApiError(401,
        `Cannot cancel order with status: ${order.status}`
      );
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    await order.save();

    await rabbitmq.publish('order.cancelled', {
      orderId: order._id.toString(),
      userId: order.userId,
      reason: 'Cancelled by user'
    });

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });

  } catch (error) {
    console.error('Error cancelling order:', error);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order'
    });
  }
};

export const getOrderStats = async (req, res) => {
  try {

    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' }
        }
      }
    ]);

    const totalOrders = await Order.countDocuments();
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentOrders = await Order.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    res.status(200).json({
      success: true,
      stats: {
        total: totalOrders,
        recent: recentOrders,
        byStatus: stats
      }
    });

  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order statistics'
    });
  }
};
