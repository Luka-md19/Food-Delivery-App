import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ServiceAuthClient } from '../client/service-auth.client';

@Injectable()
export class ServiceTokenInterceptor implements NestInterceptor {
  constructor(private readonly serviceAuthClient: ServiceAuthClient) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Check if this is a microservice context
    if (context.getType() === 'rpc') {
      const ctx = context.switchToRpc();
      const data = ctx.getData();
      const metadata = ctx.getContext<Record<string, any>>();

      // Add service token to metadata
      if (metadata && typeof metadata === 'object') {
        const token = this.serviceAuthClient.getServiceToken();
        if (token) {
          metadata.authorization = `Bearer ${token}`;
          
          // Also track the originating service
          metadata.serviceName = process.env.SERVICE_NAME || 'unknown-service';
        }
      }
    }

    return next.handle();
  }
} 