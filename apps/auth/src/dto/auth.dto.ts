import { User } from '../users/entities/user.entity';

export interface PayloadDto {
  sub: string;
  email: string;
  name?: string;
  roles?: string[];
  exp?: number;
  iat?: number;
}

export interface TokensResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  tokenType?: string;
}

export interface LoginResultDto {
  user: {
    id: string;
    email: string;
    name?: string;
    roles?: string[];
  };
  tokens: TokensResponseDto;
}

export interface RegistrationResultDto {
  user: {
    id: string;
    email: string;
    name?: string;
    roles?: string[];
  };
  tokens: TokensResponseDto;
  isVerified: boolean;
}

export interface UserProfileDto {
  id: string;
  email: string;
  name?: string;
  roles?: string[];
} 