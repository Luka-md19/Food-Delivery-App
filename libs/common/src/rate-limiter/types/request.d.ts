import { UserTrustLevel } from '../services/dynamic-rate-limiter.service';

declare global {
  namespace Express {
    interface Request {
      /**
       * Dynamic rate limit configuration for the current request
       */
      dynamicRateLimit?: {
        service: string;
        endpoint: string;
        limit: number;
        ttl: number;
        userId?: string;
        trustLevel: UserTrustLevel;
      };
      
      /**
       * Throttle configuration
       */
      throttleConfig?: {
        limit: number;
        ttl: number;
      };
    }
  }
} 