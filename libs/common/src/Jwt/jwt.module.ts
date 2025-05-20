// libs/common/src/jwt/jwt.module.ts
import { Global, Module, Logger } from '@nestjs/common';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { ConfigModule } from '../config/config.module';
import { jwtConfig } from './jwt.config';
import { JwtService } from './jwt.service';

// Debug provider to check JWT configuration
const JwtDebugProvider = {
  provide: 'JWT_DEBUG',
  useFactory: () => {
    const logger = new Logger('JwtModule');
    logger.log('JWT Module initialization');
    
    // Only check if JWT_SECRET exists, not its content
    const jwtSecretExists = !!process.env.JWT_SECRET;
    logger.log(`JWT configuration check: ${jwtSecretExists ? 'OK' : 'Missing JWT_SECRET'}`);
    
    if (!jwtSecretExists) {
      logger.error('JWT_SECRET is missing from environment, JWT signing will fail');
    }
    
    return true;
  }
};

@Global()
@Module({
  imports: [
    NestJwtModule.registerAsync(jwtConfig),
    ConfigModule,
  ],
  providers: [
    JwtService,
    JwtDebugProvider,
  ],
  exports: [NestJwtModule, JwtService],
})
export class JwtModule {} 