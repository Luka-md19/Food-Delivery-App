import { EmailJobStatus } from '../enums/email-job-status.enum';

/**
 * Response DTO for basic email job information
 */
export class EmailJobResponseDto {
  id: string;
  email: string;
  status: EmailJobStatus;
  createdAt: Date;
  updatedAt: Date;
  retries: number;
  priority: number;
  lastAttempt?: Date;
  processedAt?: Date;
  nextAttempt?: Date;
}

/**
 * Response DTO with detailed email job information including error details
 */
export class DetailedEmailJobResponseDto extends EmailJobResponseDto {
  token: string;
  lastError?: string;
  lastErrorStack?: string;
}

/**
 * Response DTO for batch processing results
 */
export class EmailJobBatchResponseDto {
  processed: number;
  successful: number;
  failed: number;
  retrying: number;
  jobIds: string[];
}

/**
 * Response DTO for email verification status
 */
export class EmailVerificationStatusResponseDto {
  email: string;
  verified: boolean;
  jobStatus?: EmailJobStatus;
  lastAttempt?: Date;
  message?: string;
} 