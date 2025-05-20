import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { User } from '../users/entities/user.entity';
import { LoggerFactory } from '@app/common';

@Injectable()
export class AuditLogService {
  private readonly logger = LoggerFactory.getLogger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async logEvent(
    eventType: string,
    user: User | null,
    details: Record<string, any> = {},
  ): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        eventType,
        userId: user?.id || null,
        user,
        details,
      });
      await this.auditLogRepository.save(auditLog);
      this.logger.debug(`Logged ${eventType} for user ${user?.id || 'unknown'}`);
    } catch (error) {
      this.logger.error(`Failed to log ${eventType}: ${error.message}`);

    }
  }

  /**
   * Create a custom audit log entry
   * @param data The audit log data
   */
  async create(data: {
    action: string;
    userId: string | null;
    targetId?: string | null;
    targetType?: string;
    details: Record<string, any>;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    try {
      // Create a basic audit log with the fields we know exist
      const auditLog = this.auditLogRepository.create({
        eventType: data.action,
        userId: data.userId,
        details: data.details || {}
      });
      
      // Optionally add the new fields if they exist in the entity
      if ('targetId' in this.auditLogRepository.metadata.propertiesMap) {
        auditLog['targetId'] = data.targetId;
      }
      
      if ('targetType' in this.auditLogRepository.metadata.propertiesMap) {
        auditLog['targetType'] = data.targetType;
      }
      
      if ('ip' in this.auditLogRepository.metadata.propertiesMap) {
        auditLog['ip'] = data.ip;
      }
      
      if ('userAgent' in this.auditLogRepository.metadata.propertiesMap) {
        auditLog['userAgent'] = data.userAgent;
      }
      
      await this.auditLogRepository.save(auditLog);
      this.logger.debug(`Created audit log for ${data.action}`);
    } catch (error) {
      this.logger.error(`Failed to create audit log for ${data.action}: ${error.message}`);
      // Don't throw error to prevent blocking the main flow
    }
  }
}