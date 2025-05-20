import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  eventType: string;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, (user) => user.auditLogs, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any>;

  @CreateDateColumn({ name: 'timestamp' })
  createdAt: Date;

  // The following fields are for service token audit logs
  // They are optional to maintain backward compatibility
  @Column({ nullable: true, default: null })
  targetId?: string;

  @Column({ nullable: true, default: null })
  targetType?: string;

  @Column({ nullable: true, default: null })
  ip?: string;

  @Column({ nullable: true, default: null })
  userAgent?: string;
}