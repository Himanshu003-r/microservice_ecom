import ApiError from "../errors/customAPIError.js"
import logger from "../utils/logger.js"

export const authorizeRoles = (...roles)=> {
    return (req,res,next)=> {
        if(!req.user){
            logger.warn('Unauthorized access')
            throw new ApiError(401,'Unauthorized access')
        }

        if(!roles.includes(req.user.role)){
                        logger.warn('Unauthorized access')
            throw new ApiError(401,'Unauthorized access')
        }
            next()
    }
}

export const checkOwnership = (resourceUserId) => {
  return (req, res, next) => {
    // Admin can access anything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    if (req.user.userId !== resourceUserId.toString()) {
      throw new CustomErrors.UnauthorizedError(
        'Not authorized to access this resource'
      );
    }

    next();
  };
};