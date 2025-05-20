// import { Injectable, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
// import { ThrottlerGuard, ThrottlerStorageService, ThrottlerModuleOptions } from '@nestjs/throttler';
// import { Reflector } from '@nestjs/core';

// @Injectable()
// export class RateLimiterGuard extends ThrottlerGuard {
//   constructor(
//     protected readonly reflector: Reflector,
//     protected readonly storageService: ThrottlerStorageService,
//   ) {
//     // Call the parent constructor with an options object.
//     // These default options won’t be used when a custom rateLimit is set via metadata.
//     super({ limit: 10, ttl: 60 } as ThrottlerModuleOptions);
//   }

//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     // Retrieve a custom rate limit if set on the handler via metadata.
//     const customLimit = this.reflector.get<number>('rateLimit', context.getHandler());
//     // if (customLimit !== undefined) {
//       const request = context.switchToHttp().getRequest();
//       const key = this.getTrackerKey(request);
//       // Use the storage service's get() method to fetch throttling data.
//       const rateLimitInfo = await this.storageService.get(key);
//       if (rateLimitInfo && rateLimitInfo.consumed >= customLimit) {
//         throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
//       }
//       return true;
//     }
//     // Otherwise, fallback to the default ThrottlerGuard behavior.
//     return super.canActivate(context);
//   }

//   protected getTrackerKey(request: any): string {
//     // Use the request IP as the tracker key.
//     return request.ip;
//   }
// }
