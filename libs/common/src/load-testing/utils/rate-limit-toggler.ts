import * as fs from 'fs';
import * as path from 'path';

/**
 * Service types supported by the rate limit toggler
 */
export type MicroserviceType = 'auth' | 'menu' | 'restaurant' | 'order';

/**
 * Configuration for the DisabledThrottlerStorage implementation
 */
export interface DisabledThrottlerConfig {
  ttl: number;
  limit: number;
  microserviceName: string;
  excludeRoutes: string[];
  useGlobalGuard: boolean;
}

/**
 * Default configuration for disabled rate limiting
 */
export const DEFAULT_DISABLED_CONFIGS: Record<MicroserviceType, DisabledThrottlerConfig> = {
  auth: {
    ttl: 60,
    limit: 100000, // Very high limit
    microserviceName: 'auth-service',
    excludeRoutes: ['/api/health/*path', '/api/load-test/*'],
    useGlobalGuard: false,
  },
  menu: {
    ttl: 60,
    limit: 100000, // Very high limit 
    microserviceName: 'menu-service',
    excludeRoutes: ['/health', '/load-test/*'],
    useGlobalGuard: false,
  },
  restaurant: {
    ttl: 60,
    limit: 100000, // Very high limit
    microserviceName: 'restaurant-service',
    excludeRoutes: ['/api/health', '/api/load-test/*'],
    useGlobalGuard: false,
  },
  order: {
    ttl: 60,
    limit: 100000, // Very high limit
    microserviceName: 'order-service',
    excludeRoutes: ['/api/health', '/api/load-test/*'],
    useGlobalGuard: false,
  }
};

/**
 * Utility class for toggling rate limiting on and off for load testing
 */
export class RateLimitToggler {
  /**
   * Toggle rate limiting for a microservice
   * 
   * @param serviceType The type of microservice
   * @param modulePath Path to the module file
   * @param mode 'enable' or 'disable'
   * @param config Optional custom configuration for disabled rate limiting
   * @returns boolean indicating success
   */
  static toggleRateLimiting(
    serviceType: MicroserviceType,
    modulePath: string, 
    mode: 'enable' | 'disable',
    config?: Partial<DisabledThrottlerConfig>
  ): boolean {
    try {
      console.log(`Attempting to ${mode} rate limiting for ${serviceType} service...`);
      
      // Merge default config with custom config if provided
      const mergedConfig = config 
        ? { ...DEFAULT_DISABLED_CONFIGS[serviceType], ...config }
        : DEFAULT_DISABLED_CONFIGS[serviceType];
      
      // Read the module file
      let moduleContent = fs.readFileSync(modulePath, 'utf8');
      
      // Ensure necessary imports are present for disabling
      if (mode === 'disable') {
        moduleContent = this.ensureImports(moduleContent, serviceType);
      }
      
      // Find the rate limiting configuration
      const startIndex = this.findRateLimitingStartIndex(moduleContent);
      
      if (startIndex === -1) {
        console.error(`Could not find rate limiting configuration in ${path.basename(modulePath)}`);
        return false;
      }
      
      // Find the end of the rate limiting configuration
      const endIndex = this.findRateLimitingEndIndex(moduleContent, startIndex);
      
      if (endIndex === -1) {
        console.error(`Could not find end of rate limiting configuration in ${path.basename(modulePath)}`);
        return false;
      }
      
      // Generate the new content
      const beforeConfig = moduleContent.substring(0, startIndex);
      const afterConfig = moduleContent.substring(endIndex);
      const newConfig = mode === 'enable' 
        ? this.generateEnabledConfig(serviceType)
        : this.generateDisabledConfig(serviceType, mergedConfig);
      
      // Create the new content and write to file
      const newContent = beforeConfig + newConfig + afterConfig;
      fs.writeFileSync(modulePath, newContent, 'utf8');
      
      console.log(`Rate limiting has been ${mode === 'enable' ? 'ENABLED' : 'DISABLED'} for ${serviceType} service`);
      console.log(`You need to rebuild and restart the ${serviceType} service for changes to take effect`);
      return true;
    } catch (error) {
      console.error(`Error toggling rate limiting: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Ensure the necessary imports are present in the file
   */
  private static ensureImports(content: string, serviceType: MicroserviceType): string {
    const throttlerStorageCheck = content.includes('import { ThrottlerStorage }');
    const disabledStorageCheck = content.includes('DisabledThrottlerStorage');
    
    if (!throttlerStorageCheck || !disabledStorageCheck) {
      const lines = content.split('\n');
      
      // Find all imports
      const importLines = lines.filter(line => line.includes('import '));
      const lastImportIndex = lines.indexOf(importLines[importLines.length - 1]);
      
      let updatedContent = content;
      
      // Add ThrottlerStorage import if needed
      if (!throttlerStorageCheck) {
        const newImport = "import { ThrottlerStorage } from '@nestjs/throttler';";
        updatedContent = [
          ...lines.slice(0, lastImportIndex + 1),
          newImport,
          ...lines.slice(lastImportIndex + 1)
        ].join('\n');
      }
      
      // Add DisabledThrottlerStorage to common imports if needed
      if (!disabledStorageCheck) {
        updatedContent = updatedContent.replace(
          /import {[^}]*ThrottlerModule,[^}]*} from '@app\/common'/,
          (match) => {
            if (match.includes('DisabledThrottlerStorage')) {
              return match;
            }
            return match.replace('ThrottlerModule,', 'ThrottlerModule, DisabledThrottlerStorage,');
          }
        );
        
        // If the replacement didn't work, add import directly
        if (!updatedContent.includes('DisabledThrottlerStorage')) {
          const commonImport = "import { DisabledThrottlerStorage } from '@app/common/rate-limiter';";
          updatedContent = [
            ...updatedContent.split('\n').slice(0, lastImportIndex + 1),
            commonImport,
            ...updatedContent.split('\n').slice(lastImportIndex + 1)
          ].join('\n');
        }
      }
      
      return updatedContent;
    }
    
    return content;
  }
  
  /**
   * Find the starting index of the rate limiting configuration
   */
  private static findRateLimitingStartIndex(content: string): number {
    // Look for rate limiting comment or ThrottlerModule
    const moduleDecoratorIndex = content.indexOf('@Module({');
    if (moduleDecoratorIndex === -1) return -1;
    
    // First try to find a proper comment marker
    const rateLimitCommentIndex = content.indexOf('// Rate limiting', moduleDecoratorIndex);
    if (rateLimitCommentIndex !== -1) {
      return rateLimitCommentIndex;
    }
    
    // If no comment, try to find ThrottlerModule
    const throttlerModuleIndex = content.indexOf('ThrottlerModule.', moduleDecoratorIndex);
    if (throttlerModuleIndex !== -1) {
      // Go back to find the start of the line
      const lineStart = content.lastIndexOf('\n', throttlerModuleIndex);
      return lineStart + 1;
    }
    
    return -1;
  }
  
  /**
   * Find the ending index of the rate limiting configuration
   */
  private static findRateLimitingEndIndex(content: string, startIndex: number): number {
    // Find the next major module after ThrottlerModule (common patterns)
    const moduleNames = ['JwtModule', 'ConfigModule', 'TypeOrmModule', 'PassportModule', 'EventEmitterModule'];
    let endIndex = -1;
    
    for (const moduleName of moduleNames) {
      const index = content.indexOf(moduleName, startIndex);
      if (index !== -1 && (endIndex === -1 || index < endIndex)) {
        endIndex = index;
      }
    }
    
    if (endIndex !== -1) {
      // Go back to the last line with '),', which is the end of the ThrottlerModule configuration
      const lastClosingBracket = content.lastIndexOf('),', endIndex);
      if (lastClosingBracket !== -1) {
        return content.indexOf('\n', lastClosingBracket) + 1;
      }
    }
    
    // If we couldn't find the next module, try to find the end of the ThrottlerModule
    const throttlerEnd = content.indexOf('),', startIndex);
    if (throttlerEnd !== -1) {
      return content.indexOf('\n', throttlerEnd) + 1;
    }
    
    return -1;
  }
  
  /**
   * Generate configuration for disabled rate limiting
   */
  private static generateDisabledConfig(
    serviceType: MicroserviceType, 
    config: DisabledThrottlerConfig
  ): string {
    return `
    // Rate limiting - DISABLED FOR LOAD TESTING
    ThrottlerModule.forRoot({
      ttl: ${config.ttl},
      limit: ${config.limit}, // Set an extremely high limit
      storage: 'memory', // Use memory storage for testing
      microserviceName: '${config.microserviceName}',
      errorMessage: 'Rate limiting disabled for testing',
      excludeRoutes: [${config.excludeRoutes.map(route => `'${route}'`).join(', ')}],
      keyPrefix: '${serviceType}-throttler:',
      useGlobalGuard: ${config.useGlobalGuard}, // ${config.useGlobalGuard ? 'Enable' : 'Disable'} global guard
      useGlobalFilter: true,
      useGlobalInterceptor: true,
      extraProviders: [
        {
          provide: ThrottlerStorage,
          useClass: DisabledThrottlerStorage,
        }
      ]
    }),
    
    // Original config - commented out for load testing
    /*
    ThrottlerModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: AppConfigService) => ({
        ttl: configService.get('THROTTLE_TTL', 60),
        limit: configService.get('THROTTLE_LIMIT', 100),
        storage: 'redis',
        microserviceName: '${config.microserviceName}',
        errorMessage: 'Too many requests from this IP, please try again later',
        excludeRoutes: ['/api/health'],
        keyPrefix: '${serviceType}-throttler:',
        useGlobalGuard: true,
        useGlobalFilter: true,
        useGlobalInterceptor: true,
      }),
      inject: [AppConfigService],
    }),
    */`;
  }
  
  /**
   * Generate configuration for enabled rate limiting
   */
  private static generateEnabledConfig(serviceType: MicroserviceType): string {
    return `
    // Rate limiting - ENABLED
    ThrottlerModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: AppConfigService) => ({
        ttl: configService.get('THROTTLE_TTL', 60),
        limit: configService.get('THROTTLE_LIMIT', 100),
        storage: 'redis',
        microserviceName: '${DEFAULT_DISABLED_CONFIGS[serviceType].microserviceName}',
        errorMessage: 'Too many requests from this IP, please try again later',
        excludeRoutes: ['/api/health'],
        keyPrefix: '${serviceType}-throttler:',
        useGlobalGuard: true,
        useGlobalFilter: true,
        useGlobalInterceptor: true,
      }),
      inject: [AppConfigService],
    }),
    
    // Disabled rate limiting configuration - comment out when not needed
    /*
    ThrottlerModule.forRoot({
      ttl: ${DEFAULT_DISABLED_CONFIGS[serviceType].ttl},
      limit: ${DEFAULT_DISABLED_CONFIGS[serviceType].limit}, // Set an extremely high limit
      storage: 'memory', // Use memory storage for testing
      microserviceName: '${DEFAULT_DISABLED_CONFIGS[serviceType].microserviceName}',
      errorMessage: 'Rate limiting disabled for testing',
      excludeRoutes: [${DEFAULT_DISABLED_CONFIGS[serviceType].excludeRoutes.map(route => `'${route}'`).join(', ')}],
      keyPrefix: '${serviceType}-throttler:',
      useGlobalGuard: ${DEFAULT_DISABLED_CONFIGS[serviceType].useGlobalGuard},
      useGlobalFilter: true,
      useGlobalInterceptor: true,
      extraProviders: [
        {
          provide: ThrottlerStorage,
          useClass: DisabledThrottlerStorage,
        }
      ]
    }),
    */`;
  }
} 