import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { LoggerFactory } from '../logger.factory';

/**
 * Middleware to track request context information
 * This follows the Single Responsibility Principle by focusing only on request context tracking
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Generate or use existing request ID
    const requestId = req.headers['x-request-id'] || uuidv4();
    const correlationId = req.headers['x-correlation-id'] || requestId;
    const userId = req.headers['x-user-id'] || null;

    // Create context object
    const context = {
      requestId,
      correlationId,
      userId,
      service: process.env.SERVICE_NAME || 'unknown',
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };

    // Get logger instance
    const logger = LoggerFactory.getLogger('HTTP');

    // Log the request
    logger.debug(`Incoming request: ${req.method} ${req.path}`);

    // Track response time
    const startTime = Date.now();

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Log based on status code
      if (statusCode >= 500) {
        logger.error(`Response: ${statusCode} - ${req.method} ${req.path} - ${duration}ms`);
      } else if (statusCode >= 400) {
        logger.warn(`Response: ${statusCode} - ${req.method} ${req.path} - ${duration}ms`);
      } else {
        logger.debug(`Response: ${statusCode} - ${req.method} ${req.path} - ${duration}ms`);
      }
    });

    next();
  }
} 