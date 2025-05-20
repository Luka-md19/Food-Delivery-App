import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

/**
 * Middleware that detects cache bypass requests and sets a flag on the request object.
 * This can be triggered by:
 * - Adding ?nocache=true to the URL
 * - Setting X-Bypass-Cache: true header
 */
@Injectable()
export class BypassCacheMiddleware implements NestMiddleware {
  private readonly logger = new Logger(BypassCacheMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const nocacheQueryParam = req.query.nocache === 'true';
    const bypassCacheHeader = req.headers['x-bypass-cache'] === 'true';
    
    // Set a flag on the request object if any bypass method is used
    if (nocacheQueryParam || bypassCacheHeader) {
      (req as any).bypassCache = true;
      this.logger.debug(`Cache bypass detected for ${req.method} ${req.path}`);
    }
    
    next();
  }
} 