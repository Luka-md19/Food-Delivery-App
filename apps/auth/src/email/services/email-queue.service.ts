import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { EmailVerificationJob } from '../entities/email-verification-job.entity';
import { EmailJobStatus } from '../enums/email-job-status.enum';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IEmailQueueService } from '../interfaces/email-queue.interface';
import { LoggerFactory } from '@app/common';

/**
 * Manages the email job queue for verification emails and other email tasks.
 * Handles queuing, processing, retrying, and monitoring of email jobs.
 */
@Injectable()
export class EmailQueueService implements OnModuleInit, OnModuleDestroy, IEmailQueueService {
  private readonly logger = LoggerFactory.getLogger(EmailQueueService.name);
  private readonly maxRetries: number;
  private readonly retryDelayMinutes: number;
  private processingInterval: NodeJS.Timeout;
  private isProcessing = false;
  private batchSize = 10;

  constructor(
    @InjectRepository(EmailVerificationJob)
    private readonly emailJobRepository: Repository<EmailVerificationJob>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.maxRetries = this.configService.get<number>('EMAIL_MAX_RETRIES', 3);
    this.retryDelayMinutes = this.configService.get<number>('EMAIL_RETRY_DELAY_MINUTES', 5);
    this.batchSize = this.configService.get<number>('EMAIL_BATCH_SIZE', 10);
    
    this.logger.log(`EmailQueueService initialized with maxRetries=${this.maxRetries}, retryDelay=${this.retryDelayMinutes}m`);
  }

  /**
   * When the module initializes, start the processing interval
   */
  onModuleInit() {
    // Process immediately on startup, then on the interval
    this.processEmailQueue().catch(err => 
      this.logger.error(`Error in initial queue processing: ${err.message}`, err.stack)
    );
  }

  /**
   * When the module is destroyed, clean up the interval
   */
  onModuleDestroy() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }

  /**
   * Queue a new email verification job
   */
  async queueVerificationEmail(email: string, token: string, priority: number = 1): Promise<EmailVerificationJob> {
    this.logger.log(`Queueing verification email for: ${email}`);

    try {
      // Check for existing jobs for this email that are not completed or failed
      const existingJob = await this.emailJobRepository.findOne({
        where: [
          { email, status: EmailJobStatus.PENDING },
          { email, status: EmailJobStatus.PROCESSING },
          { email, status: EmailJobStatus.RETRYING },
        ],
        order: { createdAt: 'DESC' },
      });

      // If there's already a job in progress, update the token and reset status
      if (existingJob) {
        this.logger.log(`Found existing job ${existingJob.id} for ${email}, updating token`);
        
        existingJob.token = token;
        existingJob.status = EmailJobStatus.PENDING;
        existingJob.retries = 0;
        existingJob.nextAttempt = null;
        existingJob.lastAttempt = null;
        existingJob.processedAt = null;
        existingJob.lastError = null;
        existingJob.lastErrorStack = null;
        
        return this.emailJobRepository.save(existingJob);
      }

      // Create a new job
      const newJob = this.emailJobRepository.create({
        id: uuidv4(),
        email,
        token,
        status: EmailJobStatus.PENDING,
        priority,
        retries: 0,
      });

      const savedJob = await this.emailJobRepository.save(newJob);
      this.logger.log(`Created new verification job ${savedJob.id} for ${email}`);
      
      return savedJob;
    } catch (error) {
      this.logger.error(`Error queueing verification email for ${email}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Process pending verification emails
   * Runs every minute to check for pending jobs
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processEmailQueue() {
    if (this.isProcessing) {
      this.logger.debug('Queue processing already in progress, skipping');
      return;
    }

    this.isProcessing = true;
    this.logger.debug('Running email queue processor');
    
    try {
      // Find jobs that are pending and ready to be processed (nextAttempt is null or in the past)
      const jobs = await this.emailJobRepository.find({
        where: [
          { 
            status: EmailJobStatus.PENDING,
            nextAttempt: null
          },
          {
            status: EmailJobStatus.PENDING,
            nextAttempt: LessThan(new Date())
          },
          {
            status: EmailJobStatus.RETRYING,
            nextAttempt: LessThan(new Date())
          }
        ],
        order: {
          priority: 'DESC', // Process high priority jobs first
          createdAt: 'ASC'  // Then oldest jobs first
        },
        take: this.batchSize
      });
      
      if (jobs.length === 0) {
        this.logger.debug('No pending email jobs found');
        return;
      }
      
      this.logger.log(`Processing ${jobs.length} email jobs`);
      
      // Process each job
      for (const job of jobs) {
        await this.processJob(job);
      }
    } catch (error) {
      this.logger.error(`Error processing email queue: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single email verification job
   * @param job The job to process
   */
  private async processJob(job: EmailVerificationJob): Promise<void> {
    try {
      // Mark as processing
      job.status = EmailJobStatus.PROCESSING;
      job.lastAttempt = new Date();
      await this.emailJobRepository.save(job);
      
      // Send the email
      this.logger.log(`Sending verification email to ${job.email}`);
      await this.emailService.sendVerificationEmail(job.email, job.token);
      
      // Mark as completed
      job.status = EmailJobStatus.COMPLETED;
      job.processedAt = new Date();
      job.lastError = null;
      job.lastErrorStack = null;
      await this.emailJobRepository.save(job);
      
      this.logger.log(`Successfully sent verification email to ${job.email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${job.email}: ${error.message}`, error.stack);
      
      // Handle failure with retry logic
      job.lastError = error.message;
      job.lastErrorStack = error.stack;
      job.retries += 1;
      
      if (job.retries >= this.maxRetries) {
        // Max retries reached, mark as failed
        job.status = EmailJobStatus.FAILED;
        this.logger.warn(`Max retries reached for email job ${job.id}, marking as failed`);
      } else {
        // Schedule retry with exponential backoff
        job.status = EmailJobStatus.RETRYING;
        const delayMinutes = this.retryDelayMinutes * Math.pow(2, job.retries - 1);
        job.nextAttempt = new Date(Date.now() + delayMinutes * 60 * 1000);
        this.logger.log(`Scheduling retry for email job ${job.id} in ${delayMinutes} minutes`);
      }
      
      await this.emailJobRepository.save(job);
    }
  }

  /**
   * Mark a job for manual retry
   */
  async retryJob(jobId: string): Promise<EmailVerificationJob> {
    this.logger.log(`Manually retrying job: ${jobId}`);
    
    const job = await this.emailJobRepository.findOne({ where: { id: jobId } });
    
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }
    
    if (job.status !== EmailJobStatus.FAILED) {
      throw new Error(`Cannot retry job that is not in FAILED status. Current status: ${job.status}`);
    }
    
    // Reset job for retry
    job.status = EmailJobStatus.PENDING;
    job.nextAttempt = null;
    job.lastAttempt = null;
    job.lastError = null;
    job.lastErrorStack = null;
    
    return this.emailJobRepository.save(job);
  }

  /**
   * Get job status by email
   */
  async getJobStatusByEmail(email: string): Promise<EmailVerificationJob | null> {
    return this.emailJobRepository.findOne({
      where: { email },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all jobs with specific status
   */
  async getJobsByStatus(status: EmailJobStatus, limit: number = 10): Promise<EmailVerificationJob[]> {
    return this.emailJobRepository.find({
      where: { status },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Delete a job
   */
  async deleteJob(jobId: string): Promise<boolean> {
    const result = await this.emailJobRepository.delete(jobId);
    return result.affected > 0;
  }
  
  /**
   * Clean up old completed jobs
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldJobs() {
    const olderThanDays = this.configService.get<number>('EMAIL_CLEANUP_DAYS', 30);
    const date = new Date();
    date.setDate(date.getDate() - olderThanDays);
    
    const result = await this.emailJobRepository.delete({
      status: EmailJobStatus.COMPLETED,
      processedAt: LessThan(date),
    });
    
    this.logger.log(`Cleaned up ${result.affected} completed jobs older than ${olderThanDays} days`);
    return result.affected;
  }

  /**
   * Force process all failed jobs
   */
  async processFailedJobs(): Promise<number> {
    const failedJobs = await this.emailJobRepository.find({
      where: { status: EmailJobStatus.FAILED },
    });
    
    let retryCount = 0;
    for (const job of failedJobs) {
      try {
        await this.retryJob(job.id);
        retryCount++;
      } catch (error) {
        this.logger.error(`Error retrying job ${job.id}: ${error.message}`);
      }
    }
    
    return retryCount;
  }

  async getNextBatch(batchSize: number): Promise<EmailVerificationJob[]> {
    try {
      // Get jobs that are pending and either have no nextAttempt or nextAttempt is in the past
      const jobs = await this.emailJobRepository.find({
        where: [
          { status: EmailJobStatus.PENDING, nextAttempt: null },
          { status: EmailJobStatus.PENDING, nextAttempt: LessThan(new Date()) },
          { status: EmailJobStatus.RETRYING, nextAttempt: LessThan(new Date()) }
        ],
        order: {
          priority: 'DESC',
          createdAt: 'ASC',
        },
        take: batchSize,
      });
      
      this.logger.debug(`Retrieved ${jobs.length} jobs for processing`);
      return jobs;
    } catch (error) {
      this.logger.error(`Failed to get next batch of jobs: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  async updateJobStatus(
    jobId: string, 
    status: EmailJobStatus, 
    error?: string
  ): Promise<EmailVerificationJob> {
    try {
      const job = await this.emailJobRepository.findOne({ where: { id: jobId } });
      
      if (!job) {
        throw new Error(`Job with ID ${jobId} not found`);
      }
      
      job.status = status;
      
      if (status === EmailJobStatus.PROCESSING) {
        job.lastAttempt = new Date();
      } else if (status === EmailJobStatus.COMPLETED) {
        job.processedAt = new Date();
      } else if (status === EmailJobStatus.FAILED) {
        job.lastError = error || 'Unknown error';
        job.lastErrorStack = new Error().stack;
      }
      
      const updatedJob = await this.emailJobRepository.save(job);
      this.logger.log(`Updated job ${jobId} status to ${status}`);
      return updatedJob;
    } catch (error) {
      this.logger.error(`Failed to update job ${jobId} status: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  async findJobsByEmail(email: string): Promise<EmailVerificationJob[]> {
    try {
      const jobs = await this.emailJobRepository.find({
        where: { email },
        order: { createdAt: 'DESC' },
      });
      
      this.logger.debug(`Found ${jobs.length} jobs for email ${email}`);
      return jobs;
    } catch (error) {
      this.logger.error(`Failed to find jobs for email ${email}: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  async findJobById(jobId: string): Promise<EmailVerificationJob | null> {
    try {
      const job = await this.emailJobRepository.findOne({ where: { id: jobId } });
      return job;
    } catch (error) {
      this.logger.error(`Failed to find job with ID ${jobId}: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  async scheduleRetry(jobId: string, backoffMinutes = 5): Promise<EmailVerificationJob> {
    try {
      const job = await this.emailJobRepository.findOne({ where: { id: jobId } });
      
      if (!job) {
        throw new Error(`Job with ID ${jobId} not found`);
      }
      
      // Increment retry count
      job.retries = (job.retries || 0) + 1;
      job.status = EmailJobStatus.RETRYING;
      
      // Calculate next attempt time with exponential backoff
      const nextAttempt = new Date();
      nextAttempt.setMinutes(nextAttempt.getMinutes() + (backoffMinutes * Math.pow(2, job.retries - 1)));
      job.nextAttempt = nextAttempt;
      
      const updatedJob = await this.emailJobRepository.save(job);
      this.logger.log(`Scheduled retry #${job.retries} for job ${jobId} at ${nextAttempt.toISOString()}`);
      return updatedJob;
    } catch (error) {
      this.logger.error(`Failed to schedule retry for job ${jobId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Process an individual job by ID
   * @param jobId The ID of the job to process
   * @returns Promise resolving to the processed job
   */
  async processJobById(jobId: string): Promise<EmailVerificationJob> {
    try {
      const job = await this.emailJobRepository.findOne({ where: { id: jobId } });
      
      if (!job) {
        throw new Error(`Job with ID ${jobId} not found`);
      }
      
      await this.processJob(job);
      
      // Return the updated job
      return this.emailJobRepository.findOne({ where: { id: jobId } });
    } catch (error) {
      this.logger.error(`Error processing job ${jobId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get recent jobs regardless of status
   * @param limit Maximum number of jobs to return
   * @returns Promise resolving to array of jobs
   */
  async getRecentJobs(limit: number = 10): Promise<EmailVerificationJob[]> {
    try {
      const jobs = await this.emailJobRepository.find({
        order: { createdAt: 'DESC' },
        take: limit,
      });
      
      this.logger.debug(`Retrieved ${jobs.length} recent jobs`);
      return jobs;
    } catch (error) {
      this.logger.error(`Failed to get recent jobs: ${error.message}`, error.stack);
      throw error;
    }
  }
} 