import mongoose from "mongoose";

const SingleOrderItemSchema = mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true },
  amount: { type: Number, required: true },
  productId: {
    type: String,
    required: true,
  },
});

const OrderSchema = new mongoose.Schema(
  {
    // Order financial details
    tax: {
      type: Number,
      required: true,
    },
    shippingFee: {
      type: Number,
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },

    // Order items
    orderItems: [SingleOrderItemSchema],

    // Order status
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },

    userId: {
      type: String,
      required: true,
      // index: true,
    },

    // Payment fields
    paymentId: String,
    paymentIntentId: String,
    clientSecret: String,
    transactionId: String,
    
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },

    // Shipping information
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },

    // // Tracking
    // trackingNumber: String,
    // carrier: String,

    // Refund fields (NEW!)
    refundId: String,
    refundAmount: Number,
    refundReason: String,
    refundedAt: Date,

    // Failure fields
    failureReason: String,
    failureCode: String,

    // Timestamps for order lifecycle
    confirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true }
);

// Indexes
OrderSchema.index({ userId: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });

const Order = mongoose.model("Order", OrderSchema);
export default Order;
