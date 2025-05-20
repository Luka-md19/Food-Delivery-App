import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn 
} from 'typeorm';
import { EmailJobStatus } from '../enums/email-job-status.enum';

@Entity('email_verification_jobs')
export class EmailVerificationJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column()
  token: string;

  @Column({
    type: 'enum',
    enum: EmailJobStatus,
    default: EmailJobStatus.PENDING,
  })
  status: EmailJobStatus;

  @Column({ default: 0 })
  retries: number;

  @Column({ default: 0 })
  priority: number;

  @Column({ type: 'timestamp', nullable: true })
  nextAttempt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastAttempt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @Column({ type: 'text', nullable: true })
  lastErrorStack: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 