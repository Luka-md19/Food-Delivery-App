import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { TokenResponse, UserRole, LoggerFactory } from '@app/common';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { ISocialAuthService } from './interfaces/auth.interface';
import { AuthenticationService } from './authentication.service';
import { User } from '../../users/entities/user.entity';

interface GoogleUserDto {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * Service for handling social authentication strategies
 * This service focuses on authentication via third-party providers like Google, Facebook, etc.
 */
@Injectable()
export class SocialAuthService implements ISocialAuthService {
  private readonly logger = LoggerFactory.getLogger(SocialAuthService.name);

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => AuthenticationService))
    private readonly authenticationService: AuthenticationService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Authenticate or create a user via Google OAuth
   * @param googleUser User information from Google
   * @returns Token response for authenticated user
   */
  async validateGoogleUser(googleUser: GoogleUserDto): Promise<TokenResponse> {
    const { googleId, email, firstName, lastName } = googleUser;
    let user = await this.usersService.findByEmail(email);
    
    if (user) {
      // User exists, link Google account if not already linked
      if (!user.googleId) {
        user = await this.usersService.updateGoogleId(user.id, googleId);
        this.logger.log(`Linked Google account ${googleId} to existing user ${user.id}`);
      }
    } else {
      // Create a new user with Google info
      const createUserDto = {
        email,
        password: null, // No password for social auth
        firstName,
        lastName,
        roles: [UserRole.CUSTOMER],
        isActive: true,
        isEmailVerified: true, // Email is verified through Google
        googleId,
      };
      
      user = await this.usersService.create(createUserDto);
      this.auditLogService.logEvent('GOOGLE_REGISTRATION', user, { email });
      this.logger.log(`Created new user ${user.id} from Google auth`);
    }
    
    // Generate authentication tokens
    const tokenResponse = await this.authenticationService.generateTokenPair(user);
    this.auditLogService.logEvent('GOOGLE_LOGIN_SUCCESS', user);
    
    return tokenResponse;
  }
  
  /**
   * Add additional social login methods here as they are implemented
   * For example: validateFacebookUser, validateAppleUser, etc.
   */
} 