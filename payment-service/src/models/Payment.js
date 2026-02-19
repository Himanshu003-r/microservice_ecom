import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
    default: 'inr',
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'succeeded', 'failed', 'cancelled'],
    default: 'pending',
  },
  paymentIntentId: {
    type: String,
    sparse: true,
  },
  checkoutSessionId: {
    type: String,
    index: true,
  },
  transactionId: {
    type: String,
  },
  paymentMethod: {
    type: {
      type: String,
    },
    last4: String,
    brand: String,
  },
  failureCode: String,
  failureMessage: String,
  succeededAt: Date,
  failedAt: Date,
}, {
  timestamps: true,
});


PaymentSchema.index({ status: 1 });

const Payment = mongoose.model("Payment", PaymentSchema);
export default Payment;


