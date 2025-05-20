import { Controller, Get, Post, Param, Query, Body, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { EmailQueueService } from '../services/email-queue.service';
import { EmailConsumerService } from '../services/email-consumer.service';
import { EmailJobStatus } from '../enums/email-job-status.enum';
import { EmailJobResponseDto, DetailedEmailJobResponseDto, EmailJobBatchResponseDto, EmailVerificationStatusResponseDto } from '../dto/email-job-response.dto';
import { LoggerFactory } from '@app/common';

@ApiTags('email-jobs')
@Controller('email-jobs')
export class EmailJobsController {
  private readonly logger = LoggerFactory.getLogger(EmailJobsController.name);

  constructor(
    private readonly emailQueueService: EmailQueueService,
    private readonly emailConsumerService: EmailConsumerService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all email jobs with optional status filter' })
  @ApiQuery({ name: 'status', enum: EmailJobStatus, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully', type: [EmailJobResponseDto] })
  async getJobs(
    @Query('status') status?: EmailJobStatus,
    @Query('limit') limit: number = 10,
  ): Promise<EmailJobResponseDto[]> {
    try {
      if (status) {
        const jobs = await this.emailQueueService.getJobsByStatus(status, limit);
        return jobs.map(this.mapToJobResponse);
      } else {
        // If no status provided, get recent jobs
        const jobs = await this.emailQueueService.getRecentJobs(limit);
        return jobs.map(this.mapToJobResponse);
      }
    } catch (error) {
      this.logger.error(`Error retrieving jobs: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job by ID' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job retrieved successfully', type: DetailedEmailJobResponseDto })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobById(@Param('id') id: string): Promise<DetailedEmailJobResponseDto> {
    try {
      const job = await this.emailQueueService.findJobById(id);
      
      if (!job) {
        throw new NotFoundException(`Job with ID ${id} not found`);
      }
      
      return this.mapToDetailedJobResponse(job);
    } catch (error) {
      this.logger.error(`Error retrieving job ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry a failed job' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job queued for retry', type: EmailJobResponseDto })
  @ApiResponse({ status: 400, description: 'Job cannot be retried' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async retryJob(@Param('id') id: string): Promise<EmailJobResponseDto> {
    try {
      const success = await this.emailConsumerService.retryFailedJob(id);
      
      if (!success) {
        throw new BadRequestException(`Could not retry job ${id}`);
      }
      
      const job = await this.emailQueueService.findJobById(id);
      return this.mapToJobResponse(job);
    } catch (error) {
      this.logger.error(`Error retrying job ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('status/by-email')
  @ApiOperation({ summary: 'Get verification status by email' })
  @ApiQuery({ name: 'email', description: 'Email address' })
  @ApiResponse({ status: 200, description: 'Status retrieved successfully', type: EmailVerificationStatusResponseDto })
  async getStatusByEmail(@Query('email') email: string): Promise<EmailVerificationStatusResponseDto> {
    try {
      if (!email) {
        throw new BadRequestException('Email parameter is required');
      }
      
      const statusResult = await this.emailConsumerService.checkVerificationStatus(email);
      const job = statusResult.job || await this.emailQueueService.getJobStatusByEmail(email);
      
      return {
        email,
        verified: statusResult.status === EmailJobStatus.COMPLETED,
        jobStatus: job?.status,
        lastAttempt: job?.lastAttempt,
        message: this.getStatusMessage(statusResult.status),
      };
    } catch (error) {
      this.logger.error(`Error checking status for ${email}: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('process/force')
  @ApiOperation({ summary: 'Force process all pending jobs' })
  @ApiResponse({ status: 200, description: 'Processing initiated', type: EmailJobBatchResponseDto })
  async forceProcess(): Promise<EmailJobBatchResponseDto> {
    try {
      await this.emailConsumerService.processQueue();
      
      // Get counts for response
      const pending = await this.emailQueueService.getJobsByStatus(EmailJobStatus.PENDING, 1000);
      const completed = await this.emailQueueService.getJobsByStatus(EmailJobStatus.COMPLETED, 1000);
      const failed = await this.emailQueueService.getJobsByStatus(EmailJobStatus.FAILED, 1000);
      const retrying = await this.emailQueueService.getJobsByStatus(EmailJobStatus.RETRYING, 1000);
      
      return {
        processed: completed.length + failed.length,
        successful: completed.length,
        failed: failed.length,
        retrying: retrying.length,
        jobIds: [...completed, ...failed, ...retrying].map(job => job.id),
      };
    } catch (error) {
      this.logger.error(`Error forcing job processing: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  @Post('retry/all-failed')
  @ApiOperation({ summary: 'Retry all failed jobs' })
  @ApiResponse({ status: 200, description: 'Retrying initiated', type: EmailJobBatchResponseDto })
  async retryAllFailed(): Promise<EmailJobBatchResponseDto> {
    try {
      const retryCount = await this.emailQueueService.processFailedJobs();
      
      // Get the updated job statuses
      const pending = await this.emailQueueService.getJobsByStatus(EmailJobStatus.PENDING, 1000);
      const retrying = await this.emailQueueService.getJobsByStatus(EmailJobStatus.RETRYING, 1000);
      
      return {
        processed: retryCount,
        successful: 0, // We don't know yet as they're just queued
        failed: 0,     // We don't know yet
        retrying: retrying.length,
        jobIds: [...pending, ...retrying].map(job => job.id),
      };
    } catch (error) {
      this.logger.error(`Error retrying failed jobs: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('verification/resend')
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({ status: 200, description: 'Email queued for resending', type: EmailJobResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async resendVerificationEmail(@Body() body: { email: string; token: string }): Promise<EmailJobResponseDto> {
    try {
      const { email, token } = body;
      
      if (!email || !token) {
        throw new BadRequestException('Email and token are required');
      }
      
      const job = await this.emailQueueService.queueVerificationEmail(email, token, 2); // Higher priority
      return this.mapToJobResponse(job);
    } catch (error) {
      this.logger.error(`Error resending verification email: ${error.message}`, error.stack);
      throw error;
    }
  }

  private mapToJobResponse(job: any): EmailJobResponseDto {
    if (!job) return null;
    
    return {
      id: job.id,
      email: job.email,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      retries: job.retries,
      priority: job.priority,
      lastAttempt: job.lastAttempt,
      processedAt: job.processedAt,
      nextAttempt: job.nextAttempt,
    };
  }

  private mapToDetailedJobResponse(job: any): DetailedEmailJobResponseDto {
    if (!job) return null;
    
    return {
      ...this.mapToJobResponse(job),
      token: job.token,
      lastError: job.lastError,
      lastErrorStack: job.lastErrorStack,
    };
  }

  private getStatusMessage(status: string): string {
    switch (status) {
      case EmailJobStatus.PENDING:
        return 'Verification email is queued and will be sent shortly.';
      case EmailJobStatus.PROCESSING:
        return 'Verification email is being sent.';
      case EmailJobStatus.COMPLETED:
        return 'Verification email was sent successfully.';
      case EmailJobStatus.FAILED:
        return 'Failed to send verification email. Please try again.';
      case EmailJobStatus.RETRYING:
        return 'Verification email sending failed but will be retried automatically.';
      case 'NO_JOB_FOUND':
        return 'No verification email has been requested for this address.';
      case 'ERROR':
        return 'An error occurred while checking the verification status.';
      default:
        return 'Unknown status.';
    }
  }
} 