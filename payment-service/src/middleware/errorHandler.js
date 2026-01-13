import logger from "../utils/logger.js";
const errorHandler = (err, req, res, next) => {

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';
  
  const logContext = {
    message: err.message,
    statusCode,
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?.id || req.user?._id,
    timestamp: new Date().toISOString()
  };

  if (err.name === 'CastError') {
    statusCode = 404;
    message = `Resource not found with id: ${err.value}`;
    logContext.errorType = 'CastError';
    logContext.invalidId = err.value;
  }

  else if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern || {})[0];
    message = field 
      ? `Duplicate value for field: ${field}` 
      : 'Duplicate key error';
    logContext.errorType = 'DuplicateKeyError';
    logContext.field = field;
  }

  else if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map(val => val.message);
    message = errors.join(', ');
    logContext.errorType = 'ValidationError';
    logContext.validationErrors = errors;
  }

  else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON payload';
    logContext.errorType = 'JSONParseError';
  }

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


  if (statusCode >= 500) {
    logger.error('Server Error:', {
      ...logContext,
      stack: err.stack,
      error: err
    });
  } else if (statusCode >= 400) {
    logger.warn('Client Error:', logContext);
  } else {
    logger.info('Error Handler:', logContext);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err.toString()
    })
  });
};

export default errorHandler