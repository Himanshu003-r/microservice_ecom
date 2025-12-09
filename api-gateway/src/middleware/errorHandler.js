import logger from "../utils/logger.js";
const errorHandler = (err, req, res, next) => {
  // Determine status code
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';
  
  // Prepare log context
  const logContext = {
    message: err.message,
    statusCode,
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?.id || req.user?._id, // if using authentication
    timestamp: new Date().toISOString()
  };

  // Mongoose bad ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 404;
    message = `Resource not found with id: ${err.value}`;
    logContext.errorType = 'CastError';
    logContext.invalidId = err.value;
  }

  // Mongoose duplicate key error
  else if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern || {})[0];
    message = field 
      ? `Duplicate value for field: ${field}` 
      : 'Duplicate key error';
    logContext.errorType = 'DuplicateKeyError';
    logContext.field = field;
  }

  // Mongoose validation error
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map(val => val.message);
    message = errors.join(', ');
    logContext.errorType = 'ValidationError';
    logContext.validationErrors = errors;
  }

  // JSON parsing error
  else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON payload';
    logContext.errorType = 'JSONParseError';
  }

  // JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    logContext.errorType = 'JWTError';
  }

  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    logContext.errorType = 'TokenExpiredError';
  }

  // Log based on severity
  if (statusCode >= 500) {
    // Server errors - log with stack trace
    logger.error('Server Error:', {
      ...logContext,
      stack: err.stack,
      error: err
    });
  } else if (statusCode >= 400) {
    // Client errors - log without stack trace
    logger.warn('Client Error:', logContext);
  } else {
    // Unexpected status codes
    logger.info('Error Handler:', logContext);
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    message,
    // Include additional details only in development
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err.toString()
    })
  });
};

export default errorHandler