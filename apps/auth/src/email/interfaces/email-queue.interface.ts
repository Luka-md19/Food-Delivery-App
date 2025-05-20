import { EmailVerificationJob } from '../entities/email-verification-job.entity';
import { EmailJobStatus } from '../enums/email-job-status.enum';

/**
 * Interface for the email queue service that manages email jobs
 */
export interface IEmailQueueService {
  /**
   * Queues a verification email job
   * @param email The recipient email address
   * @param token The verification token
   * @param priority Optional priority level
   * @returns Promise resolving to the created job
   */
  queueVerificationEmail(email: string, token: string, priority?: number): Promise<EmailVerificationJob>;
  
  /**
   * Gets the next batch of pending jobs to process
   * @param batchSize The number of jobs to fetch
   * @returns Promise resolving to an array of jobs
   */
  getNextBatch(batchSize: number): Promise<EmailVerificationJob[]>;
  
  /**
   * Updates the status of a job
   * @param jobId The ID of the job to update
   * @param status The new status
   * @param error Optional error information
   * @returns Promise resolving to the updated job
   */
  updateJobStatus(jobId: string, status: EmailJobStatus, error?: string): Promise<EmailVerificationJob>;
  
  /**
   * Finds jobs by email address
   * @param email The email address to search for
   * @returns Promise resolving to an array of jobs
   */
  findJobsByEmail(email: string): Promise<EmailVerificationJob[]>;
  
  /**
   * Finds a job by ID
   * @param jobId The ID of the job to find
   * @returns Promise resolving to the job or null
   */
  findJobById(jobId: string): Promise<EmailVerificationJob | null>;
  
  /**
   * Schedules a retry for a failed job
   * @param jobId The ID of the job to retry
   * @param backoffMinutes Optional delay in minutes
   * @returns Promise resolving to the updated job
   */
  scheduleRetry(jobId: string, backoffMinutes?: number): Promise<EmailVerificationJob>;
  
  /**
   * Process an individual job by ID
   * @param jobId The ID of the job to process
   * @returns Promise resolving to the processed job
   */
  processJobById(jobId: string): Promise<EmailVerificationJob>;
  
  /**
   * Get job status by email address
   * @param email The email address to check
   * @returns Promise resolving to the job or null
   */
  getJobStatusByEmail(email: string): Promise<EmailVerificationJob | null>;
  
  /**
   * Retry a failed job
   * @param jobId The ID of the job to retry
   * @returns Promise resolving to the updated job
   */
  retryJob(jobId: string): Promise<EmailVerificationJob>;
  
  /**
   * Get recent jobs regardless of status
   * @param limit Maximum number of jobs to return
   * @returns Promise resolving to array of jobs
   */
  getRecentJobs(limit?: number): Promise<EmailVerificationJob[]>;
  
  /**
   * Get jobs with a specific status
   * @param status The status to filter by
   * @param limit Maximum number of jobs to return
   * @returns Promise resolving to array of jobs
   */
  getJobsByStatus(status: EmailJobStatus, limit?: number): Promise<EmailVerificationJob[]>;
} 