import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters']
    },
    
    description: {
      type: String,
      required: [true, 'Product description is required'],
      maxlength: [1000, 'Description cannot be more than 1000 characters']
    },
    
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative']
    },
    
    image: {
      type: String,
      required: [true, 'Product image is required']
    },
    
    category: {
      type: String,
      required: [true, 'Product category is required'],
      enum: {
        values: ['Electronics', 'Clothing', 'Books', 'Home', 'Sports', 'Other'],
        message: '{VALUE} is not a valid category'
      }
    },
    
    inventory: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Inventory cannot be negative']
    },
    
    featured: {
      type: Boolean,
      default: false
    },
    
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    
    numReviews: {
      type: Number,
      default: 0
    }
    
  },
  { 
    timestamps: true 
  }
);

ProductSchema.index({ name: 'text', description: 'text' }); 
ProductSchema.index({ category: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ featured: 1 });

const Product = mongoose.model('Product', ProductSchema)
export default Product