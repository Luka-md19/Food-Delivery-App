import { 
  Entity, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  PrimaryGeneratedColumn, 
  OneToMany 
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from '@app/common';
import { RefreshToken } from '../../token/entities/refresh-token.entity';
import { ResetPasswordToken } from '../../reset-password/reset-password-token.entity';
import { AuditLog } from '../../audit-log/audit-log.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ 
    type: 'enum', 
    enum: UserRole, 
    array: true, 
    default: [UserRole.CUSTOMER] 
  })
  roles: UserRole[];

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true, unique: true })
  googleId: string;
  
  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  emailVerificationToken: string;

  @Column({ nullable: true, type: 'timestamptz' })
  emailVerificationExpires: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockUntil: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => RefreshToken, refreshToken => refreshToken.user, { cascade: true })
  refreshTokens: RefreshToken[];

  @OneToMany(() => ResetPasswordToken, token => token.user, { cascade: true })
  resetPasswordTokens: ResetPasswordToken[];

  @OneToMany(() => AuditLog, (auditLog) => auditLog.user)
  auditLogs: AuditLog[];

  hasRole(role: UserRole): boolean {
    return this.roles.includes(role);
  }
}
