import User from "../models/User.js";
import logger from "../utils/logger.js";
import { validateRegistration, validateLogin } from "../utils/validation.js";
import generateToken from "../utils/generateToken.js";
import RefreshToken from "../models/RefereshToken.js";
import ApiError from "../errors/customAPIError.js";

export const registerUser = async (req, res) => {
  logger.info("User registration endpoint hit");
  try {
    // Validate the schema
    const { error } = validateRegistration(req.body);
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const {  username,email, password } = req.body;

    let existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      logger.warn("User already exists");
      throw new ApiError(409, "User already exists");
    }

    const user = await User.create({
      username,
      email,
      password,
    });

    logger.warn("User saved successfully", user._id);

    const { accessToken, refreshToken } = await generateToken(user);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
    logger.error("Registration error occured");

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

export const loginUser = async (req, res) => {
  logger.info("User login endpoint hit");
  try {
    const { error } = validateLogin(req.body);
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      logger.warn("Invalid user");
      throw new ApiError(400, "Invalid credentials");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
      logger.warn("Invalid password");
      throw new ApiError(400, "Invalid password");
    }

    const { accessToken, refreshToken } = await generateToken(user);

    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      data: user,
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
    logger.error("Login error occured");
  
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

export const refreshTokenUser = async (req, res) => {
  logger.info("Requesting refresh token");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing");
      throw new ApiError(400, "No refresh token provided");
    }

    const storedToken = await RefreshToken.findOne({ token: refreshToken });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn("Invalid or expired refresh token");
      throw new ApiError(401, "Invalid or expired refresh token");
    }

    const user = await User.findById(storedToken.user);

    if (!user) {
      logger.warn("User not found");
      throw new ApiError(401, "User not found");
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateToken(user);

    await RefreshToken.deleteOne({ _id: storedToken._id });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error("Refresh token error occured");
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

export const logoutUser = async (req, res) => {
  logger.info("Logout user");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing");
      throw new ApiError(400, "Refresh token missing");
    }
    
    await RefreshToken.deleteOne({ token: refreshToken });
    logger.info("Refresh token deleted");

    res.status(200).json({
      success: true,
      message: "User logged out",
    });
  } catch (error) {
    logger.error("Logout error occured");
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
