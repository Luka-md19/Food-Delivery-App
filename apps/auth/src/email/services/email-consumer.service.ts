import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EmailQueueService } from './email-queue.service';
import { EmailJobStatus } from '../enums/email-job-status.enum';
import { IEmailConsumerService } from '../interfaces/email-consumer.interface';
import { LoggerFactory } from '@app/common';

@Injectable()
export class EmailConsumerService implements OnModuleInit, OnModuleDestroy, IEmailConsumerService {
  private readonly logger = LoggerFactory.getLogger(EmailConsumerService.name);
  private readonly batchSize = 10;
  private readonly processingIntervalMs = 10000; // 10 seconds
  private processingInterval: NodeJS.Timeout;
  private isProcessing = false;

  constructor(
    private readonly emailQueueService: EmailQueueService
  ) {}

  /**
   * Initialize the service and start processing on module init
   */
  onModuleInit() {
    this.logger.log('Initializing EmailConsumerService');
    this.startProcessing();
  }

  /**
   * Stop processing on module destroy
   */
  onModuleDestroy() {
    this.logger.log('Shutting down EmailConsumerService');
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }

  /**
   * Start the queue processing interval
   */
  startProcessing() {
    this.logger.log(`Starting email queue processing with interval: ${this.processingIntervalMs}ms`);
    
    // Process queue immediately on startup
    this.processQueue().catch(err => 
      this.logger.error(`Error in initial queue processing: ${err.message}`, err.stack)
    );
    
    // Set up interval for continuous processing
    this.processingInterval = setInterval(async () => {
      try {
        await this.processQueue();
      } catch (error) {
        this.logger.error(`Error processing queue: ${error.message}`, error.stack);
      }
    }, this.processingIntervalMs);
  }

  /**
   * Process the next batch of email jobs from the queue
   */
  async processQueue(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      this.logger.debug('Already processing queue, skipping');
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // Get the next batch of jobs
      const jobs = await this.emailQueueService.getNextBatch(this.batchSize);
      
      if (jobs.length === 0) {
        this.logger.debug('No jobs found for processing');
        return;
      }
      
      this.logger.log(`Processing ${jobs.length} email jobs`);
      
      // Process each job in the batch
      for (const job of jobs) {
        try {
          // Process the job using the queue service
          this.logger.log(`Processing job ${job.id} for ${job.email}`);
          await this.emailQueueService.processJobById(job.id);
          this.logger.log(`Successfully processed job ${job.id}`);
        } catch (error) {
          this.logger.error(`Error processing job ${job.id}: ${error.message}`, error.stack);
          
          // Check if job should be retried
          try {
            const updatedJob = await this.emailQueueService.findJobById(job.id);
            if (updatedJob && updatedJob.status === EmailJobStatus.FAILED && updatedJob.retries < 3) {
              await this.emailQueueService.scheduleRetry(job.id);
            }
          } catch (updateError) {
            this.logger.error(`Failed to check/schedule retry for job ${job.id}: ${updateError.message}`, updateError.stack);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error processing email queue: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Manually retry a failed job
   */
  async retryFailedJob(jobId: string): Promise<boolean> {
    try {
      this.logger.log(`Manually retrying job: ${jobId}`);
      
      // Get the job
      const job = await this.emailQueueService.findJobById(jobId);
      
      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }
      
      if (job.status !== EmailJobStatus.FAILED) {
        throw new Error(`Cannot retry job that is not in FAILED status. Current status: ${job.status}`);
      }
      
      // Retry the job
      await this.emailQueueService.retryJob(jobId);
      return true;
    } catch (error) {
      this.logger.error(`Error retrying job ${jobId}: ${error.message}`, error.stack);
      return false;
    }
  }
  
  /**
   * Check the status of a verification email for a specific email address
   */
  async checkVerificationStatus(email: string): Promise<{ status: string, job?: any }> {
    try {
      const latestJob = await this.emailQueueService.getJobStatusByEmail(email);
      
      if (!latestJob) {
        return { status: 'NO_JOB_FOUND' };
      }
      
      return { 
        status: latestJob.status,
        job: latestJob
      };
    } catch (error) {
      this.logger.error(`Error checking verification status for ${email}: ${error.message}`, error.stack);
      return { status: 'ERROR' };
    }
  }
} 