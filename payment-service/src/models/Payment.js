import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
    },
    amount: {
      type: String,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "inr",
      uppercase: true,
    },

    // Stripe Details

    paymentIntentId: {
      type: String,
      required: true,
      unique: true,
    },

    clientSecret: {
      type: String,
      required: true,
    },

    transactionId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
    },

    // Payment Status
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed", "refunded"],
      default: "pending",
    },

    paymentMethod: {
      type: String, // 'card', 'upi', etc.
      last4: String, // Last 4 digits
      brand: String, // 'visa', 'mastercard'
    },

    refundId: String,
    refundAmount: Number,
    refundReason: String,

    failureCode: String,
    failureMessage: String,

    succeededAt: Date,
    failedAt: Date,
    refundedAt: Date,
  },
  {
    timestamps: true,
  }
);

PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ status: 1 });

const Payment = mongoose.model("Payment", PaymentSchema);
export default Payment;
