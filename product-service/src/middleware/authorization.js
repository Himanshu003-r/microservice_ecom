import ApiError from "../errors/customAPIError.js";
import logger from "../utils/logger.js";

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn("Unauthorized access");
      throw new ApiError(401, "Unauthorized access");
    }

    if (!roles.includes(req.user.role)) {
      logger.warn("Unauthorized access");
      throw new ApiError(401, "Unauthorized access");
    }
    next();
  };
};
