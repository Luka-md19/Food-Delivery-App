import { Injectable } from '@nestjs/common';
import { RATE_LIMIT_CONFIGS } from '../constants/rate-limit-configs';
import { LoggerFactory } from '../../logger/logger.factory';

/**
 * User trust level that affects rate limiting
 */
export enum UserTrustLevel {
  NEW = 'new',          // New users with limited history
  STANDARD = 'standard', // Regular users with good history
  TRUSTED = 'trusted',   // Long-term users with excellent history
  AUTOMATED = 'automated' // Service accounts or automated clients
}

/**
 * Service that provides dynamic rate limiting based on various factors
 */
@Injectable()
export class DynamicRateLimiterService {
  private readonly logger = LoggerFactory.getLogger(DynamicRateLimiterService.name);
  
  // Server load multiplier (can be updated by metrics service)
  private serverLoadMultiplier = 1.0;
  
  // Time of day modifiers (can be configured)
  private timeOfDayModifiers = {
    peak: 1.0,       // Peak hours (standard rates)
    offPeak: 1.5,    // Off-peak hours (50% more requests allowed)
    maintenance: 0.5 // Maintenance hours (50% fewer requests allowed)
  };

  constructor() {
    // Service initialized by dependency injection
  }

  /**
   * Get dynamically adjusted rate limit for a specific endpoint and user
   */
  public getRateLimit(
    service: keyof typeof RATE_LIMIT_CONFIGS,
    endpoint: string,
    userId?: string,
    trustLevel: UserTrustLevel = UserTrustLevel.STANDARD
  ): { ttl: number; limit: number } {
    // Get base configuration
    const baseConfig = this.getBaseConfig(service, endpoint);
    
    // Apply adjustments based on various factors
    return this.applyAdjustments(baseConfig, trustLevel);
  }

  /**
   * Get base rate limit configuration
   */
  private getBaseConfig(service: keyof typeof RATE_LIMIT_CONFIGS, endpoint: string): { ttl: number; limit: number } {
    const config = RATE_LIMIT_CONFIGS[service]?.[endpoint];
    
    if (!config) {
      this.logger.warn(`Rate limit configuration not found for ${String(service)}.${endpoint}, using defaults`);
      return { ttl: 60, limit: 10 };
    }
    
    return { ...config };
  }

  /**
   * Apply various adjustments to the base rate limit
   */
  private applyAdjustments(
    baseConfig: { ttl: number; limit: number },
    trustLevel: UserTrustLevel
  ): { ttl: number; limit: number } {
    const result = { ...baseConfig };
    
    // Apply trust level multiplier
    result.limit = Math.floor(result.limit * this.getTrustLevelMultiplier(trustLevel));
    
    // Apply server load multiplier
    result.limit = Math.floor(result.limit * this.serverLoadMultiplier);
    
    // Apply time of day modifier
    const timeModifier = this.getCurrentTimeModifier();
    result.limit = Math.floor(result.limit * timeModifier);
    
    // Ensure minimum values
    result.limit = Math.max(1, result.limit);
    result.ttl = Math.max(1, result.ttl);
    
    return result;
  }

  /**
   * Get multiplier based on user trust level
   */
  private getTrustLevelMultiplier(trustLevel: UserTrustLevel): number {
    switch (trustLevel) {
      case UserTrustLevel.NEW:
        return 1.0; // Standard rate for new users
      case UserTrustLevel.STANDARD:
        return 1.0; // Standard users get normal limits
      case UserTrustLevel.TRUSTED:
        return 2.0; // Trusted users get double limits
      case UserTrustLevel.AUTOMATED:
        return 5.0; // Automated clients get 5x limits
      default:
        return 1.0;
    }
  }

  /**
   * Get current time of day modifier
   */
  private getCurrentTimeModifier(): number {
    const hour = new Date().getHours();
    
    // Define peak hours (9am-5pm)
    if (hour >= 9 && hour < 17) {
      return this.timeOfDayModifiers.peak;
    }
    
    // Define maintenance window (1am-5am)
    if (hour >= 1 && hour < 5) {
      return this.timeOfDayModifiers.maintenance;
    }
    
    // Off-peak for remaining hours
    return this.timeOfDayModifiers.offPeak;
  }

  /**
   * Update server load multiplier (called by metrics service)
   */
  public updateServerLoad(loadFactor: number): void {
    // Normalize between 0.1 and 1.5
    // High load reduces the multiplier, low load increases it
    this.serverLoadMultiplier = Math.max(0.1, Math.min(1.5, 1.5 - loadFactor));
  }
} 