/* eslint-disable no-unused-vars */
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error with Ridges Automotors context
  logger.error('API Error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    company: 'Ridges Automotors',
    timestamp: new Date().toISOString(),
  });

  // Prisma Database Errors
  if (err.code === 'P2002') {
    const message = 'Duplicate value for unique field';
    error = { message, statusCode: 400 };
  }

  if (err.code === 'P2025') {
    const message = 'Record not found';
    error = { message, statusCode: 404 };
  }

  if (err.code === 'P2003') {
    const message = 'Foreign key constraint failed';
    error = { message, statusCode: 400 };
  }

  if (err.code === 'P2014') {
    const message = 'Invalid data provided';
    error = { message, statusCode: 400 };
  }

  // Mongoose/MongoDB Errors (if migrating from MongoDB)
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message);
    error = { message, statusCode: 400 };
  }

  // JWT Authentication Errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid authentication token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Authentication token expired';
    error = { message, statusCode: 401 };
  }

  // Express Validation Errors
  if (err.type === 'entity.parse.failed') {
    const message = 'Invalid JSON format';
    error = { message, statusCode: 400 };
  }

  // File Upload Errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File size too large';
    error = { message, statusCode: 413 };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Too many files uploaded';
    error = { message, statusCode: 413 };
  }

  // Rate Limiting Errors
  if (err.status === 429) {
    const message = 'Too many requests, please try again later';
    error = { message, statusCode: 429 };
  }

  // Database Connection Errors
  if (err.code === 'ECONNREFUSED') {
    const message = 'Database connection failed';
    error = { message, statusCode: 503 };
  }

  // Construct error response
  const errorResponse = {
    success: false,
    error: error.message || 'Internal Server Error',
    company: 'Ridges Automotors',
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown',
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = {
      originalError: err.name,
      code: err.code,
      path: req.originalUrl,
      method: req.method,
    };
  }

  // Add helpful suggestions for common errors
  if (error.statusCode === 404) {
    errorResponse.suggestion = 'Check the URL and make sure the resource exists';
    errorResponse.availableEndpoints = ['/api/vehicles', '/api/leads', '/api/company', '/health'];
  }

  if (error.statusCode === 401) {
    errorResponse.suggestion = 'Please log in or check your authentication token';
  }

  if (error.statusCode === 403) {
    errorResponse.suggestion = 'You do not have permission to access this resource';
  }

  if (error.statusCode === 429) {
    errorResponse.suggestion = 'Please wait before making more requests';
    errorResponse.retryAfter = '15 minutes';
  }

  res.status(error.statusCode || 500).json(errorResponse);
};

module.exports = errorHandler;
