import Product from "../models/Product.js";
import ApiError from "../errors/customAPIError.js";
import logger from "../utils/logger.js";

export const getAllProducts = async (req, res) => {
  logger.info("Create product endpoint hit");
  try {
    const {
      category,
      featured,
      minPrice,
      maxPrice,
      search,
      sort = "-createdAt",
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (featured) {
      filter.featured = featured;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (search) {
      filter.$text = { $search: search };
    }

    const products = await Product.find(filter)
      .sort(sort)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Product.countDocuments(filter);

    res.status(201).json({
      success: true,
      products,
      count: products.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    logger.error("An error occured while fetching all product");
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

export const getSingleProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    logger.error("Error fetching product");
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

export const createProduct = async (req, res) => {
  try {
    const { name, description, price, image, category, inventory } = req.body;

    if (!name || !description || !price || !image || !category) {
      throw new ApiError(400, "Please provide all required fields");
    }

    const product = await Product.create({
      name,
      description,
      price,
      image,
      category,
      inventory: inventory || 0,
    });

    res.status(201).json({
      success: true,
      product,
    });
  } catch (error) {
    logger.error("Error creating product");
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

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const product = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    logger.error("Error updating product");
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

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting product");
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

export const updateInventory = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || quantity === undefined) {
      throw new ApiError(400, "Fields cannot be empty");
    }

    const product = await Product.findById(productId);

    if (!product) {
      throw new ApiError(404, `Product with id ${productId} does not exist`);
    }

    if (product.inventory < quantity) {
      return res.status(400).json({
        success: false,
        message: "Insufficient inventory",
      });
    }

    // Updating the inventory
    product.inventory -= quantity;
    await product.save();

    res.status(200).json({
      success: true,
      product: {
        id: product._id,
        name: product.name,
        inventory: product.inventory,
      },
    });

  } catch (error) {
    logger.error("Error updating product");
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
