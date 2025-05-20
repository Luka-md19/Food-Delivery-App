import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';

/**
 * Interface for the email consumer service that processes jobs from the email queue
 */
export interface IEmailConsumerService {
  /**
   * Start processing the email queue
   * Sets up an interval to continuously check for new jobs
   */
  startProcessing(): void;

  /**
   * Process the next batch of email jobs from the queue
   * Gets jobs from the queue and processes them one by one
   */
  processQueue(): Promise<void>;

  /**
   * Manually retry a failed job
   * @param jobId The ID of the job to retry
   * @returns Promise resolving to a boolean indicating success
   */
  retryFailedJob(jobId: string): Promise<boolean>;

  /**
   * Check the status of a verification email for a specific email address
   * @param email The email address to check
   * @returns Promise resolving to an object with the job status and details
   */
  checkVerificationStatus(email: string): Promise<{ status: string, job?: any }>;
} 