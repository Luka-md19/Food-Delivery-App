import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

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
      throw new Error(`Audit log failure: ${error.message}`); // Re-throw for upstream handling
    }
  }
}