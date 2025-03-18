/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./apps/auth/src/auth.controller.ts":
/*!******************************************!*\
  !*** ./apps/auth/src/auth.controller.ts ***!
  \******************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthController = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const auth_service_1 = __webpack_require__(/*! ./auth.service */ "./apps/auth/src/auth.service.ts");
const register_dto_1 = __webpack_require__(/*! ./dto/register.dto */ "./apps/auth/src/dto/register.dto.ts");
const login_dto_1 = __webpack_require__(/*! ./dto/login.dto */ "./apps/auth/src/dto/login.dto.ts");
const forgot_password_dto_1 = __webpack_require__(/*! ./dto/forgot-password.dto */ "./apps/auth/src/dto/forgot-password.dto.ts");
const reset_password_dto_1 = __webpack_require__(/*! ./dto/reset-password.dto */ "./apps/auth/src/dto/reset-password.dto.ts");
const update_password_dto_1 = __webpack_require__(/*! ./dto/update-password.dto */ "./apps/auth/src/dto/update-password.dto.ts");
const common_2 = __webpack_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@app/common'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
const common_3 = __webpack_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@app/common'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
const update_current_user_dto_1 = __webpack_require__(/*! ./dto/update-current-user.dto */ "./apps/auth/src/dto/update-current-user.dto.ts");
const Logout_dto_1 = __webpack_require__(/*! ./dto/Logout.dto */ "./apps/auth/src/dto/Logout.dto.ts");
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    async register(registerDto) {
        return this.authService.register(registerDto);
    }
    async login(loginDto) {
        return this.authService.login(loginDto);
    }
    async logout(user, logoutDto) {
        return this.authService.logout(user.userId, logoutDto.refreshToken);
    }
    async refreshToken(refreshToken) {
        return this.authService.refreshAccessToken(refreshToken);
    }
    async getProfile(user) {
        return user;
    }
    async forgotPassword(forgotPasswordDto) {
        return this.authService.forgotPassword(forgotPasswordDto.email);
    }
    async resetPassword(resetPasswordDto) {
        if (resetPasswordDto.newPassword !== resetPasswordDto.confirmNewPassword) {
            throw new common_1.BadRequestException('New password and confirm password do not match');
        }
        return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
    }
    async updatePassword(user, updatePasswordDto) {
        return this.authService.updatePassword(user.userId, updatePasswordDto.oldPassword, updatePasswordDto.newPassword, updatePasswordDto.confirmNewPassword);
    }
    async updateProfile(user, updateCurrentUserDto) {
        return this.authService.updateProfile(user.userId, updateCurrentUserDto);
    }
    async deleteProfile(user) {
        await this.authService.deleteAccount(user.userId);
        return { message: 'User account deleted successfully.' };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, swagger_1.ApiOperation)({ summary: 'Register a new user' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'User registered successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, swagger_1.ApiOperation)({ summary: 'User login' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User logged in successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.UseGuards)(common_3.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Logout and invalidate refresh token' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Logout successful' }),
    __param(0, (0, common_2.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Logout_dto_1.LogoutDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, swagger_1.ApiOperation)({ summary: 'Refresh access token' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Access token refreshed successfully' }),
    __param(0, (0, common_1.Body)('refreshToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refreshToken", null);
__decorate([
    (0, common_1.Get)('profile'),
    (0, common_2.ApiAuth)(),
    (0, common_1.UseGuards)(common_3.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get authenticated user profile' }),
    __param(0, (0, common_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, swagger_1.ApiOperation)({ summary: 'Initiate forgot password process' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Reset token generated and sent via email (simulated)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forgot_password_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, swagger_1.ApiOperation)({ summary: 'Reset password using reset token' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Password reset successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Post)('update-password'),
    (0, common_2.ApiAuth)(),
    (0, common_1.UseGuards)(common_3.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Update password for authenticated user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Password updated successfully' }),
    __param(0, (0, common_2.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_password_dto_1.UpdatePasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updatePassword", null);
__decorate([
    (0, common_1.Patch)('profile'),
    (0, common_2.ApiAuth)(),
    (0, common_1.UseGuards)(common_3.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Update current user profile' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User profile updated successfully' }),
    __param(0, (0, common_2.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_current_user_dto_1.UpdateCurrentUserDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Delete)('profile'),
    (0, common_2.ApiAuth)(),
    (0, common_1.UseGuards)(common_3.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Delete current user account' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User account deleted successfully' }),
    __param(0, (0, common_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "deleteProfile", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Authentication'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);


/***/ }),

/***/ "./apps/auth/src/auth.module.ts":
/*!**************************************!*\
  !*** ./apps/auth/src/auth.module.ts ***!
  \**************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthModule = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const passport_1 = __webpack_require__(/*! @nestjs/passport */ "@nestjs/passport");
const common_2 = __webpack_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@app/common'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
const auth_service_1 = __webpack_require__(/*! ./auth.service */ "./apps/auth/src/auth.service.ts");
const auth_controller_1 = __webpack_require__(/*! ./auth.controller */ "./apps/auth/src/auth.controller.ts");
const jwt_strategy_1 = __webpack_require__(/*! ./strategies/jwt.strategy */ "./apps/auth/src/strategies/jwt.strategy.ts");
const local_strategy_1 = __webpack_require__(/*! ./strategies/local.strategy */ "./apps/auth/src/strategies/local.strategy.ts");
const users_module_1 = __webpack_require__(/*! ./users/users.module */ "./apps/auth/src/users/users.module.ts");
const token_module_1 = __webpack_require__(/*! ./token/token.module */ "./apps/auth/src/token/token.module.ts");
const reset_password_service_1 = __webpack_require__(/*! ./reset-password.service */ "./apps/auth/src/reset-password.service.ts");
const typeorm_1 = __webpack_require__(/*! @nestjs/typeorm */ "@nestjs/typeorm");
const reset_password_token_entity_1 = __webpack_require__(/*! ./entites/reset-password-token.entity */ "./apps/auth/src/entites/reset-password-token.entity.ts");
const user_entity_1 = __webpack_require__(/*! ./users/entities/user.entity */ "./apps/auth/src/users/entities/user.entity.ts");
const refresh_token_entity_1 = __webpack_require__(/*! ./token/entities/refresh-token.entity */ "./apps/auth/src/token/entities/refresh-token.entity.ts");
const common_3 = __webpack_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@app/common'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            common_3.DatabaseModule.forRoot('AUTH', [user_entity_1.User, refresh_token_entity_1.RefreshToken, reset_password_token_entity_1.ResetPasswordToken]),
            common_2.JwtModule,
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            users_module_1.UsersModule,
            token_module_1.TokenModule,
            typeorm_1.TypeOrmModule.forFeature([reset_password_token_entity_1.ResetPasswordToken]),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, jwt_strategy_1.JwtStrategy, local_strategy_1.LocalStrategy, reset_password_service_1.ResetPasswordService],
        exports: [auth_service_1.AuthService],
    })
], AuthModule);


/***/ }),

/***/ "./apps/auth/src/auth.service.ts":
/*!***************************************!*\
  !*** ./apps/auth/src/auth.service.ts ***!
  \***************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const jwt_1 = __webpack_require__(/*! @nestjs/jwt */ "@nestjs/jwt");
const bcrypt = __webpack_require__(/*! bcryptjs */ "bcryptjs");
const users_service_1 = __webpack_require__(/*! ../src/users/users.service */ "./apps/auth/src/users/users.service.ts");
const common_2 = __webpack_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@app/common'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
const token_service_1 = __webpack_require__(/*! ./token/token.service */ "./apps/auth/src/token/token.service.ts");
const reset_password_service_1 = __webpack_require__(/*! ./reset-password.service */ "./apps/auth/src/reset-password.service.ts");
let AuthService = AuthService_1 = class AuthService {
    constructor(jwtService, tokenService, usersService, resetPasswordService) {
        this.jwtService = jwtService;
        this.tokenService = tokenService;
        this.usersService = usersService;
        this.resetPasswordService = resetPasswordService;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async register(registerDto) {
        try {
            if (!registerDto.email || !registerDto.password || !registerDto.confirmPassword) {
                throw new common_1.BadRequestException('Email, password, and confirm password are required');
            }
            if (registerDto.password !== registerDto.confirmPassword) {
                throw new common_1.BadRequestException('Password and confirm password do not match');
            }
            const existingUser = await this.usersService.findByEmail(registerDto.email);
            if (existingUser) {
                throw new common_1.ConflictException('User already exists');
            }
            const { confirmPassword, ...userData } = registerDto;
            const user = await this.usersService.create({
                ...userData,
                roles: registerDto.roles || [common_2.UserRole.CUSTOMER],
            });
            return this.generateTokenPair(user);
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            this.logger.error('Error in register method:', error);
            throw new common_1.InternalServerErrorException('An unexpected error occurred');
        }
    }
    async login(loginDto) {
        try {
            const user = await this.validateUserCredentials(loginDto.email, loginDto.password);
            if (!user.isActive) {
                throw new common_1.UnauthorizedException('Account is inactive');
            }
            return this.generateTokenPair(user);
        }
        catch (error) {
            this.logger.error(`Login error: ${error.message}`);
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
    }
    async validateUserCredentials(email, password) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid password');
        }
        return user;
    }
    async generateTokenPair(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            roles: user.roles
        };
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: '15m'
        });
        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: '7d'
        });
        await this.tokenService.createRefreshToken(user, refreshToken);
        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                roles: user.roles
            }
        };
    }
    async refreshAccessToken(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken);
            const user = await this.usersService.findById(payload.userId);
            await this.tokenService.validateRefreshToken(user, refreshToken);
            return this.generateTokenPair(user);
        }
        catch (error) {
            this.logger.error(`Token refresh error: ${error.message}`);
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    async validateToken(token) {
        try {
            return this.jwtService.verify(token);
        }
        catch {
            return null;
        }
    }
    async forgotPassword(email) {
        try {
            const token = await this.resetPasswordService.createResetToken(email);
            return {
                message: 'Password reset token generated. Check your email for further instructions.',
                token
            };
        }
        catch (error) {
            this.logger.error(`Forgot password error: ${error.message}`);
            throw error;
        }
    }
    async resetPassword(token, newPassword) {
        try {
            await this.resetPasswordService.resetPassword(token, newPassword);
            return { message: 'Password has been reset successfully.' };
        }
        catch (error) {
            this.logger.error(`Reset password error: ${error.message}`);
            throw error;
        }
    }
    async updatePassword(userId, oldPassword, newPassword, confirmNewPassword) {
        if (newPassword !== confirmNewPassword) {
            throw new common_1.BadRequestException('New password and confirm password do not match');
        }
        const user = await this.usersService.findById(userId);
        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            throw new common_1.BadRequestException('Old password is incorrect');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.usersService.updatePassword(userId, hashedPassword);
        return { message: 'Password updated successfully.' };
    }
    async updateProfile(userId, updateData) {
        try {
            await this.usersService.update(userId, updateData);
            return { message: 'User profile updated successfully.' };
        }
        catch (error) {
            this.logger.error(`Profile update error: ${error.message}`);
            throw error;
        }
    }
    async deleteAccount(userId) {
        try {
            await this.usersService.deleteUser(userId);
            return { message: 'User account deleted successfully.' };
        }
        catch (error) {
            this.logger.error(`User deletion error: ${error.message}`);
            throw error;
        }
    }
    async logout(userId, refreshToken) {
        try {
            const user = await this.usersService.findById(userId);
            await this.tokenService.removeRefreshToken(user, refreshToken);
            return { message: 'User logged out successfully.' };
        }
        catch (error) {
            this.logger.error(`Logout error: ${error.message}`);
            throw error;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => users_service_1.UsersService))),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        token_service_1.TokenService,
        users_service_1.UsersService,
        reset_password_service_1.ResetPasswordService])
], AuthService);


/***/ }),

/***/ "./apps/auth/src/dto/Logout.dto.ts":
/*!*****************************************!*\
  !*** ./apps/auth/src/dto/Logout.dto.ts ***!
  \*****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LogoutDto = void 0;
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
class LogoutDto {
}
exports.LogoutDto = LogoutDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'refresh-token-value',
        description: 'The refresh token to be invalidated upon logout.',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], LogoutDto.prototype, "refreshToken", void 0);


/***/ }),

/***/ "./apps/auth/src/dto/forgot-password.dto.ts":
/*!**************************************************!*\
  !*** ./apps/auth/src/dto/forgot-password.dto.ts ***!
  \**************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ForgotPasswordDto = void 0;
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
class ForgotPasswordDto {
}
exports.ForgotPasswordDto = ForgotPasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'user@example.com',
        description: 'the email address for password reset',
    }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ForgotPasswordDto.prototype, "email", void 0);


/***/ }),

/***/ "./apps/auth/src/dto/login.dto.ts":
/*!****************************************!*\
  !*** ./apps/auth/src/dto/login.dto.ts ***!
  \****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LoginDto = void 0;
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
class LoginDto {
}
exports.LoginDto = LoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'user@example.com' }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'password123' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);


/***/ }),

/***/ "./apps/auth/src/dto/register.dto.ts":
/*!*******************************************!*\
  !*** ./apps/auth/src/dto/register.dto.ts ***!
  \*******************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RegisterDto = void 0;
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const common_1 = __webpack_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@app/common'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
const class_transformer_1 = __webpack_require__(/*! class-transformer */ "class-transformer");
class RegisterDto {
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'user@example.com' }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'password123' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'password123' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(8),
    (0, common_1.Match)('password', { message: 'confirm password must match password' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "confirmPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'John' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Doe' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: [common_1.UserRole.CUSTOMER],
        enum: common_1.UserRole,
        isArray: true,
        description: 'Optional role. Defaults to CUSTOMER if not provided.',
        enumName: 'UserRole'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(common_1.UserRole, {
        message: 'Role must be one of: ADMIN, CUSTOMER, DELIVERY_AGENT, RESTAURANT',
        each: true
    }),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value === undefined || value === null)
            return [common_1.UserRole.CUSTOMER];
        return typeof value === 'string' ? [value] : value;
    }, { toClassOnly: true }),
    __metadata("design:type", Array)
], RegisterDto.prototype, "roles", void 0);


/***/ }),

/***/ "./apps/auth/src/dto/reset-password.dto.ts":
/*!*************************************************!*\
  !*** ./apps/auth/src/dto/reset-password.dto.ts ***!
  \*************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ResetPasswordDto = void 0;
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const common_1 = __webpack_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@app/common'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
class ResetPasswordDto {
}
exports.ResetPasswordDto = ResetPasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'reset-token-value', description: 'The reset token received by email' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'newPassword123', description: 'The new password' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "newPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'newPassword123', description: 'Confirm the new password' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, common_1.Match)('newPassword', { message: 'Confirm password must match new password' }),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "confirmNewPassword", void 0);


/***/ }),

/***/ "./apps/auth/src/dto/update-current-user.dto.ts":
/*!******************************************************!*\
  !*** ./apps/auth/src/dto/update-current-user.dto.ts ***!
  \******************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UpdateCurrentUserDto = void 0;
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
class UpdateCurrentUserDto {
}
exports.UpdateCurrentUserDto = UpdateCurrentUserDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Malik',
        description: 'The first name of the user',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateCurrentUserDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'ALkahzendar',
        description: 'The last name of the user',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateCurrentUserDto.prototype, "lastName", void 0);


/***/ }),

/***/ "./apps/auth/src/dto/update-password.dto.ts":
/*!**************************************************!*\
  !*** ./apps/auth/src/dto/update-password.dto.ts ***!
  \**************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UpdatePasswordDto = void 0;
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const common_1 = __webpack_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@app/common'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
class UpdatePasswordDto {
}
exports.UpdatePasswordDto = UpdatePasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'oldPassword123', description: 'Current (old) password' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdatePasswordDto.prototype, "oldPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'newPassword123', description: 'New password' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], UpdatePasswordDto.prototype, "newPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'newPassword123', description: 'Confirm new password' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, common_1.Match)('newPassword', { message: 'Confirm password must match new password' }),
    __metadata("design:type", String)
], UpdatePasswordDto.prototype, "confirmNewPassword", void 0);


/***/ }),

/***/ "./apps/auth/src/dto/update-user-roles.dto.ts":
/*!****************************************************!*\
  !*** ./apps/auth/src/dto/update-user-roles.dto.ts ***!
  \****************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UpdateUserRolesDto = void 0;
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const common_1 = __webpack_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@app/common'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
class UpdateUserRolesDto {
}
exports.UpdateUserRolesDto = UpdateUserRolesDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: [common_1.UserRole.ADMIN],
        description: 'Array of user roles',
        enum: common_1.UserRole,
        isArray: true,
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(common_1.UserRole, { each: true }),
    __metadata("design:type", Array)
], UpdateUserRolesDto.prototype, "roles", void 0);


/***/ }),

/***/ "./apps/auth/src/entites/reset-password-token.entity.ts":
/*!**************************************************************!*\
  !*** ./apps/auth/src/entites/reset-password-token.entity.ts ***!
  \**************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ResetPasswordToken = void 0;
const typeorm_1 = __webpack_require__(/*! typeorm */ "typeorm");
const user_entity_1 = __webpack_require__(/*! ../../src/users/entities/user.entity */ "./apps/auth/src/users/entities/user.entity.ts");
let ResetPasswordToken = class ResetPasswordToken {
};
exports.ResetPasswordToken = ResetPasswordToken;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ResetPasswordToken.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], ResetPasswordToken.prototype, "token", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, user => user.resetPasswordTokens, { onDelete: 'CASCADE' }),
    __metadata("design:type", user_entity_1.User)
], ResetPasswordToken.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], ResetPasswordToken.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], ResetPasswordToken.prototype, "used", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ResetPasswordToken.prototype, "createdAt", void 0);
exports.ResetPasswordToken = ResetPasswordToken = __decorate([
    (0, typeorm_1.Entity)('reset_password_tokens')
], ResetPasswordToken);


/***/ }),

/***/ "./apps/auth/src/polyfills.ts":
/*!************************************!*\
  !*** ./apps/auth/src/polyfills.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const crypto = __webpack_require__(/*! crypto */ "crypto");
if (!global.crypto) {
    global.crypto = crypto;
}


/***/ }),

/***/ "./apps/auth/src/reset-password.service.ts":
/*!*************************************************!*\
  !*** ./apps/auth/src/reset-password.service.ts ***!
  \*************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ResetPasswordService_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ResetPasswordService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const typeorm_1 = __webpack_require__(/*! @nestjs/typeorm */ "@nestjs/typeorm");
const typeorm_2 = __webpack_require__(/*! typeorm */ "typeorm");
const reset_password_token_entity_1 = __webpack_require__(/*! ./entites/reset-password-token.entity */ "./apps/auth/src/entites/reset-password-token.entity.ts");
const users_service_1 = __webpack_require__(/*! ../src/users/users.service */ "./apps/auth/src/users/users.service.ts");
const crypto = __webpack_require__(/*! crypto */ "crypto");
const bcrypt = __webpack_require__(/*! bcryptjs */ "bcryptjs");
let ResetPasswordService = ResetPasswordService_1 = class ResetPasswordService {
    constructor(resetPasswordRepository, usersService) {
        this.resetPasswordRepository = resetPasswordRepository;
        this.usersService = usersService;
        this.logger = new common_1.Logger(ResetPasswordService_1.name);
        this.TOKEN_EXPIRATION_MINUTES = 15;
    }
    async createResetToken(email) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + this.TOKEN_EXPIRATION_MINUTES);
        const resetToken = this.resetPasswordRepository.create({
            token,
            user,
            expiresAt,
        });
        try {
            await this.resetPasswordRepository.save(resetToken);
        }
        catch (error) {
            this.logger.error('Error saving reset token', error);
            throw new common_1.InternalServerErrorException('Could not create reset token');
        }
        return token;
    }
    async resetPassword(token, newPassword) {
        const resetToken = await this.resetPasswordRepository.findOne({
            where: { token },
            relations: ['user'],
        });
        if (!resetToken) {
            throw new common_1.BadRequestException('Invalid reset token');
        }
        if (resetToken.used) {
            throw new common_1.BadRequestException('Reset token has already been used');
        }
        if (new Date() > resetToken.expiresAt) {
            throw new common_1.BadRequestException('Reset token has expired');
        }
        const user = resetToken.user;
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.usersService.updatePassword(user.id, hashedPassword);
        resetToken.used = true;
        await this.resetPasswordRepository.save(resetToken);
    }
};
exports.ResetPasswordService = ResetPasswordService;
exports.ResetPasswordService = ResetPasswordService = ResetPasswordService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(reset_password_token_entity_1.ResetPasswordToken)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        users_service_1.UsersService])
], ResetPasswordService);


/***/ }),

/***/ "./apps/auth/src/strategies/jwt.strategy.ts":
/*!**************************************************!*\
  !*** ./apps/auth/src/strategies/jwt.strategy.ts ***!
  \**************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JwtStrategy = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const passport_1 = __webpack_require__(/*! @nestjs/passport */ "@nestjs/passport");
const passport_jwt_1 = __webpack_require__(/*! passport-jwt */ "passport-jwt");
const common_2 = __webpack_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@app/common'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    constructor(configService) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get('JWT_SECRET'),
        });
        this.configService = configService;
    }
    async validate(payload) {
        return payload;
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [common_2.AppConfigService])
], JwtStrategy);


/***/ }),

/***/ "./apps/auth/src/strategies/local.strategy.ts":
/*!****************************************************!*\
  !*** ./apps/auth/src/strategies/local.strategy.ts ***!
  \****************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LocalStrategy = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const passport_1 = __webpack_require__(/*! @nestjs/passport */ "@nestjs/passport");
const passport_local_1 = __webpack_require__(/*! passport-local */ "passport-local");
const auth_service_1 = __webpack_require__(/*! ../auth.service */ "./apps/auth/src/auth.service.ts");
let LocalStrategy = class LocalStrategy extends (0, passport_1.PassportStrategy)(passport_local_1.Strategy) {
    constructor(authService) {
        super({ usernameField: 'email' });
        this.authService = authService;
    }
    async validate(email, password) {
        try {
            return await this.authService.validateUserCredentials(email, password);
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
    }
};
exports.LocalStrategy = LocalStrategy;
exports.LocalStrategy = LocalStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], LocalStrategy);


/***/ }),

/***/ "./apps/auth/src/token/entities/refresh-token.entity.ts":
/*!**************************************************************!*\
  !*** ./apps/auth/src/token/entities/refresh-token.entity.ts ***!
  \**************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RefreshToken = void 0;
const typeorm_1 = __webpack_require__(/*! typeorm */ "typeorm");
const user_entity_1 = __webpack_require__(/*! ../../users/entities/user.entity */ "./apps/auth/src/users/entities/user.entity.ts");
let RefreshToken = class RefreshToken {
    isExpired() {
        return new Date() > this.expiresAt;
    }
};
exports.RefreshToken = RefreshToken;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], RefreshToken.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], RefreshToken.prototype, "token", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], RefreshToken.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], RefreshToken.prototype, "isRevoked", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], RefreshToken.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.refreshTokens, { onDelete: 'CASCADE' }),
    __metadata("design:type", user_entity_1.User)
], RefreshToken.prototype, "user", void 0);
exports.RefreshToken = RefreshToken = __decorate([
    (0, typeorm_1.Entity)('refresh_tokens')
], RefreshToken);


/***/ }),

/***/ "./apps/auth/src/token/token.module.ts":
/*!*********************************************!*\
  !*** ./apps/auth/src/token/token.module.ts ***!
  \*********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TokenModule = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const common_2 = __webpack_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@app/common'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
const token_service_1 = __webpack_require__(/*! ./token.service */ "./apps/auth/src/token/token.service.ts");
const refresh_token_entity_1 = __webpack_require__(/*! ./entities/refresh-token.entity */ "./apps/auth/src/token/entities/refresh-token.entity.ts");
let TokenModule = class TokenModule {
};
exports.TokenModule = TokenModule;
exports.TokenModule = TokenModule = __decorate([
    (0, common_1.Module)({
        imports: [common_2.DatabaseModule.forFeature([refresh_token_entity_1.RefreshToken])],
        providers: [token_service_1.TokenService],
        exports: [token_service_1.TokenService],
    })
], TokenModule);


/***/ }),

/***/ "./apps/auth/src/token/token.service.ts":
/*!**********************************************!*\
  !*** ./apps/auth/src/token/token.service.ts ***!
  \**********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var TokenService_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TokenService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const typeorm_1 = __webpack_require__(/*! @nestjs/typeorm */ "@nestjs/typeorm");
const typeorm_2 = __webpack_require__(/*! typeorm */ "typeorm");
const refresh_token_entity_1 = __webpack_require__(/*! ./entities/refresh-token.entity */ "./apps/auth/src/token/entities/refresh-token.entity.ts");
let TokenService = TokenService_1 = class TokenService {
    constructor(refreshTokenRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.logger = new common_1.Logger(TokenService_1.name);
    }
    async createRefreshToken(user, token) {
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const refreshToken = this.refreshTokenRepository.create({
            token,
            user,
            expiresAt,
            isRevoked: false,
        });
        return this.refreshTokenRepository.save(refreshToken);
    }
    async validateRefreshToken(user, token) {
        const foundToken = await this.refreshTokenRepository.findOne({
            where: { token, user: { id: user.id }, isRevoked: false },
            relations: ['user'],
        });
        if (!foundToken || foundToken.isExpired()) {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
    }
    async removeRefreshToken(user, token) {
        const tokenEntity = await this.refreshTokenRepository.findOne({
            where: { token, user: { id: user.id } },
        });
        if (!tokenEntity) {
            throw new common_1.UnauthorizedException('refresh token not found');
        }
        await this.refreshTokenRepository.delete(tokenEntity.id);
        this.logger.debug(`Removed refresh token for user ${user.id}`);
    }
};
exports.TokenService = TokenService;
exports.TokenService = TokenService = TokenService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(refresh_token_entity_1.RefreshToken)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TokenService);


/***/ }),

/***/ "./apps/auth/src/users/admin-users.controllers.ts":
/*!********************************************************!*\
  !*** ./apps/auth/src/users/admin-users.controllers.ts ***!
  \********************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AdminUsersController_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AdminUsersController = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const users_service_1 = __webpack_require__(/*! ./users.service */ "./apps/auth/src/users/users.service.ts");
const update_user_dto_1 = __webpack_require__(/*! ./dto/update-user.dto */ "./apps/auth/src/users/dto/update-user.dto.ts");
const common_2 = __webpack_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@app/common'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
const update_user_roles_dto_1 = __webpack_require__(/*! ../dto/update-user-roles.dto */ "./apps/auth/src/dto/update-user-roles.dto.ts");
let AdminUsersController = AdminUsersController_1 = class AdminUsersController {
    constructor(usersService) {
        this.usersService = usersService;
        this.logger = new common_1.Logger(AdminUsersController_1.name);
    }
    async getAllUsers() {
        return await this.usersService.findAll();
    }
    async getUserById(id) {
        const user = await this.usersService.findById(id);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async updateUser(id, updateUserDto) {
        return await this.usersService.update(id, updateUserDto);
    }
    async deleteUser(id) {
        await this.usersService.deleteUser(id);
        return { message: 'User deleted successfully' };
    }
    async updateUserRoles(id, updateUserRolesDto) {
        return await this.usersService.updateUserRoles(id, updateUserRolesDto.roles);
    }
};
exports.AdminUsersController = AdminUsersController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all users (Admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of all users' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "getAllUsers", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a user by ID (Admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User details' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "getUserById", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a user by ID (Admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User updated successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a user by ID (Admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User deleted successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.Put)(':id/roles'),
    (0, swagger_1.ApiOperation)({ summary: 'Update roles for a user (Admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User roles updated successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_user_roles_dto_1.UpdateUserRolesDto]),
    __metadata("design:returntype", Promise)
], AdminUsersController.prototype, "updateUserRoles", null);
exports.AdminUsersController = AdminUsersController = AdminUsersController_1 = __decorate([
    (0, swagger_1.ApiTags)('Admin Users'),
    (0, common_1.Controller)('admin/users'),
    (0, common_1.UseGuards)(common_2.JwtAuthGuard, common_2.RolesGuard),
    (0, common_2.Roles)(common_2.UserRole.ADMIN),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], AdminUsersController);


/***/ }),

/***/ "./apps/auth/src/users/dto/update-user.dto.ts":
/*!****************************************************!*\
  !*** ./apps/auth/src/users/dto/update-user.dto.ts ***!
  \****************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UpdateUserDto = void 0;
const class_validator_1 = __webpack_require__(/*! class-validator */ "class-validator");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const common_1 = __webpack_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@app/common'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
class UpdateUserDto {
}
exports.UpdateUserDto = UpdateUserDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'John', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Doe', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'user@example.com' }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: false, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateUserDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: [common_1.UserRole.CUSTOMER],
        enum: common_1.UserRole,
        isArray: true,
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], UpdateUserDto.prototype, "roles", void 0);


/***/ }),

/***/ "./apps/auth/src/users/entities/user.entity.ts":
/*!*****************************************************!*\
  !*** ./apps/auth/src/users/entities/user.entity.ts ***!
  \*****************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.User = void 0;
const typeorm_1 = __webpack_require__(/*! typeorm */ "typeorm");
const class_transformer_1 = __webpack_require__(/*! class-transformer */ "class-transformer");
const common_1 = __webpack_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@app/common'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
const refresh_token_entity_1 = __webpack_require__(/*! ../../token/entities/refresh-token.entity */ "./apps/auth/src/token/entities/refresh-token.entity.ts");
const reset_password_token_entity_1 = __webpack_require__(/*! ../../entites/reset-password-token.entity */ "./apps/auth/src/entites/reset-password-token.entity.ts");
let User = class User {
    hasRole(role) {
        return this.roles.includes(role);
    }
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: common_1.UserRole,
        array: true,
        default: [common_1.UserRole.CUSTOMER]
    }),
    __metadata("design:type", Array)
], User.prototype, "roles", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => refresh_token_entity_1.RefreshToken, refreshToken => refreshToken.user, { cascade: true }),
    __metadata("design:type", Array)
], User.prototype, "refreshTokens", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => reset_password_token_entity_1.ResetPasswordToken, token => token.user, { cascade: true }),
    __metadata("design:type", Array)
], User.prototype, "resetPasswordTokens", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users')
], User);


/***/ }),

/***/ "./apps/auth/src/users/users.controller.ts":
/*!*************************************************!*\
  !*** ./apps/auth/src/users/users.controller.ts ***!
  \*************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UsersController = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const swagger_1 = __webpack_require__(/*! @nestjs/swagger */ "@nestjs/swagger");
const users_service_1 = __webpack_require__(/*! ./users.service */ "./apps/auth/src/users/users.service.ts");
const update_user_dto_1 = __webpack_require__(/*! ./dto/update-user.dto */ "./apps/auth/src/users/dto/update-user.dto.ts");
const common_2 = __webpack_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@app/common'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    async getProfile(user) {
        const logger = new common_1.Logger('ProfileEndpoint');
        logger.debug(`Profile requested for user: ${JSON.stringify(user)}`);
        if (!user) {
            logger.error('No user data available in request');
            throw new common_1.UnauthorizedException('User data not found');
        }
        if (!user.userId) {
            logger.error('No userId found in user data');
            throw new common_1.UnauthorizedException('Invalid user data');
        }
        return this.usersService.findById(user.userId);
    }
    async updateProfile(user, updateUserDto) {
        return this.usersService.update(user.userId, updateUserDto);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('profile'),
    (0, common_2.ApiAuth)(),
    (0, common_1.UseGuards)(common_2.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get user profile' }),
    __param(0, (0, common_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Put)('profile'),
    (0, common_2.ApiAuth)(),
    (0, common_1.UseGuards)(common_2.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Update user profile' }),
    __param(0, (0, common_2.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateProfile", null);
exports.UsersController = UsersController = __decorate([
    (0, swagger_1.ApiTags)('Users'),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);


/***/ }),

/***/ "./apps/auth/src/users/users.module.ts":
/*!*********************************************!*\
  !*** ./apps/auth/src/users/users.module.ts ***!
  \*********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UsersModule = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const common_2 = __webpack_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@app/common'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
const users_service_1 = __webpack_require__(/*! ./users.service */ "./apps/auth/src/users/users.service.ts");
const users_controller_1 = __webpack_require__(/*! ./users.controller */ "./apps/auth/src/users/users.controller.ts");
const admin_users_controllers_1 = __webpack_require__(/*! ./admin-users.controllers */ "./apps/auth/src/users/admin-users.controllers.ts");
const user_entity_1 = __webpack_require__(/*! ./entities/user.entity */ "./apps/auth/src/users/entities/user.entity.ts");
const auth_module_1 = __webpack_require__(/*! ../auth.module */ "./apps/auth/src/auth.module.ts");
let UsersModule = class UsersModule {
};
exports.UsersModule = UsersModule;
exports.UsersModule = UsersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            common_2.DatabaseModule.forFeature([user_entity_1.User]),
            (0, common_1.forwardRef)(() => auth_module_1.AuthModule),
        ],
        controllers: [users_controller_1.UsersController, admin_users_controllers_1.AdminUsersController],
        providers: [users_service_1.UsersService],
        exports: [users_service_1.UsersService],
    })
], UsersModule);


/***/ }),

/***/ "./apps/auth/src/users/users.service.ts":
/*!**********************************************!*\
  !*** ./apps/auth/src/users/users.service.ts ***!
  \**********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UsersService_1;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UsersService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const bcrypt = __webpack_require__(/*! bcryptjs */ "bcryptjs");
const typeorm_1 = __webpack_require__(/*! @nestjs/typeorm */ "@nestjs/typeorm");
const typeorm_2 = __webpack_require__(/*! typeorm */ "typeorm");
const user_entity_1 = __webpack_require__(/*! ./entities/user.entity */ "./apps/auth/src/users/entities/user.entity.ts");
const common_2 = __webpack_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@app/common'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
const auth_service_1 = __webpack_require__(/*! ../auth.service */ "./apps/auth/src/auth.service.ts");
let UsersService = UsersService_1 = class UsersService {
    constructor(userRepository, authService) {
        this.userRepository = userRepository;
        this.authService = authService;
        this.logger = new common_1.Logger(UsersService_1.name);
    }
    async create(createUserDto) {
        try {
            const existingUser = await this.findByEmail(createUserDto.email);
            if (existingUser) {
                throw new common_1.ConflictException('User already exists');
            }
            const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
            const userData = {
                ...createUserDto,
                password: hashedPassword,
                roles: createUserDto.roles || [common_2.UserRole.CUSTOMER],
                isActive: true
            };
            return await this.userRepository.save(this.userRepository.create(userData));
        }
        catch (error) {
            this.logger.error(`User creation error: ${error.message}`);
            throw error;
        }
    }
    async findById(id) {
        const user = await this.userRepository.findOne({
            where: { id },
            select: ['id', 'email', 'firstName', 'lastName', 'roles', 'isActive', 'password']
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async findByEmail(email) {
        return this.userRepository.findOne({
            where: { email },
            relations: []
        });
    }
    async findAll() {
        try {
            return await this.userRepository.find();
        }
        catch (error) {
            this.logger.error(`Error fetching all users: ${error.message}`);
            throw error;
        }
    }
    async update(id, updateUserDto) {
        try {
            const user = await this.findById(id);
            Object.assign(user, updateUserDto);
            return await this.userRepository.save(user);
        }
        catch (error) {
            this.logger.error(`User update error: ${error.message}`);
            throw error;
        }
    }
    async updatePassword(id, hashedPassword) {
        try {
            const user = await this.findById(id);
            user.password = hashedPassword;
            return await this.userRepository.save(user);
        }
        catch (error) {
            this.logger.error(`Password update error: ${error.message}`);
            throw error;
        }
    }
    async deleteUser(id) {
        try {
            const user = await this.findById(id);
            await this.userRepository.remove(user);
        }
        catch (error) {
            this.logger.error(`User deletion error: ${error.message}`);
            throw error;
        }
    }
    async deactivate(id) {
        const user = await this.findById(id);
        user.isActive = false;
        return await this.userRepository.save(user);
    }
    async updateUserRoles(id, roles) {
        const user = await this.findById(id);
        user.roles = roles;
        return await this.userRepository.save(user);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => auth_service_1.AuthService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        auth_service_1.AuthService])
], UsersService);


/***/ }),

/***/ "@nestjs/common":
/*!*********************************!*\
  !*** external "@nestjs/common" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("@nestjs/common");

/***/ }),

/***/ "@nestjs/core":
/*!*******************************!*\
  !*** external "@nestjs/core" ***!
  \*******************************/
/***/ ((module) => {

module.exports = require("@nestjs/core");

/***/ }),

/***/ "@nestjs/jwt":
/*!******************************!*\
  !*** external "@nestjs/jwt" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("@nestjs/jwt");

/***/ }),

/***/ "@nestjs/microservices":
/*!****************************************!*\
  !*** external "@nestjs/microservices" ***!
  \****************************************/
/***/ ((module) => {

module.exports = require("@nestjs/microservices");

/***/ }),

/***/ "@nestjs/passport":
/*!***********************************!*\
  !*** external "@nestjs/passport" ***!
  \***********************************/
/***/ ((module) => {

module.exports = require("@nestjs/passport");

/***/ }),

/***/ "@nestjs/swagger":
/*!**********************************!*\
  !*** external "@nestjs/swagger" ***!
  \**********************************/
/***/ ((module) => {

module.exports = require("@nestjs/swagger");

/***/ }),

/***/ "@nestjs/typeorm":
/*!**********************************!*\
  !*** external "@nestjs/typeorm" ***!
  \**********************************/
/***/ ((module) => {

module.exports = require("@nestjs/typeorm");

/***/ }),

/***/ "bcryptjs":
/*!***************************!*\
  !*** external "bcryptjs" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("bcryptjs");

/***/ }),

/***/ "class-transformer":
/*!************************************!*\
  !*** external "class-transformer" ***!
  \************************************/
/***/ ((module) => {

module.exports = require("class-transformer");

/***/ }),

/***/ "class-validator":
/*!**********************************!*\
  !*** external "class-validator" ***!
  \**********************************/
/***/ ((module) => {

module.exports = require("class-validator");

/***/ }),

/***/ "passport-jwt":
/*!*******************************!*\
  !*** external "passport-jwt" ***!
  \*******************************/
/***/ ((module) => {

module.exports = require("passport-jwt");

/***/ }),

/***/ "passport-local":
/*!*********************************!*\
  !*** external "passport-local" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("passport-local");

/***/ }),

/***/ "typeorm":
/*!**************************!*\
  !*** external "typeorm" ***!
  \**************************/
/***/ ((module) => {

module.exports = require("typeorm");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("crypto");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
/*!*******************************!*\
  !*** ./apps/auth/src/main.ts ***!
  \*******************************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
__webpack_require__(/*! ./polyfills */ "./apps/auth/src/polyfills.ts");
const core_1 = __webpack_require__(/*! @nestjs/core */ "@nestjs/core");
const microservices_1 = __webpack_require__(/*! @nestjs/microservices */ "@nestjs/microservices");
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const auth_module_1 = __webpack_require__(/*! ./auth.module */ "./apps/auth/src/auth.module.ts");
const common_2 = __webpack_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@app/common'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
async function bootstrap() {
    const app = await core_1.NestFactory.create(auth_module_1.AuthModule);
    const configService = app.get(common_2.AppConfigService);
    const logger = new common_1.Logger('Auth Service');
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
    }));
    app.enableCors();
    common_2.Swaggerservice.setup(app, {
        title: 'Auth Service API',
        description: 'Authentication and Authorization Service',
        version: '1.0',
        tags: ['auth'],
    });
    app.connectMicroservice({
        transport: microservices_1.Transport.TCP,
        options: {
            host: '0.0.0.0',
            port: configService.get('TCP_PORT', 3001),
        },
    });
    await app.startAllMicroservices();
    await app.listen(configService.port);
    logger.log(`HTTP server running on port ${configService.port}`);
    logger.log(`TCP server running on port ${configService.get('TCP_PORT', 3001)}`);
    logger.log(`Swagger documentation available at ${configService.get('SWAGGER_PATH', 'api/docs')}`);
}
bootstrap();

})();

/******/ })()
;