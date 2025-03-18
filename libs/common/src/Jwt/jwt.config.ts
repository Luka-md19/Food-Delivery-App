import { JwtModuleAsyncOptions } from '@nestjs/jwt';
import { ConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/config.service';

export const jwtConfig: JwtModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [AppConfigService],
  useFactory: async (configService: AppConfigService) => {
    const secret = configService.get<string>('JWT_SECRET');
    // Make complexity check configurable via an environment variable.
    const complexityRequired = configService.get<string>('JWT_SECRET_COMPLEXITY_REQUIRED', 'true') === 'true';
    if (complexityRequired) {
      // Enforce: at least 32 characters, one lowercase, one uppercase, one digit, and one special character.
      const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{32,}$/;
      if (!regex.test(secret)) {
        throw new Error('JWT_SECRET does not meet complexity requirements. Please ensure it is at least 32 characters long and includes uppercase, lowercase, numbers, and special characters.');
      }
    }
    return {
      secret,
      signOptions: {
        expiresIn: configService.get<string>('JWT_EXPIRATION', '15m'),
      },
    };
  },
};