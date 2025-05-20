import { 
  Entity, 
  Column, 
  ManyToOne, 
  PrimaryGeneratedColumn, 
  CreateDateColumn,
  Index,
  JoinColumn
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('refresh_tokens')
@Index('idx_composite_active_sessions', ['user', 'isRevoked', 'expiresAt']) // Named composite index
@Index('idx_token_lookup', ['token']) // Named index for token lookups
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index('idx_token_validation') // Named index for token validation
  token: string;

  @Column({ type: 'timestamp' })
  @Index('idx_expiration_cleanup') // Named index for expiration-based cleanup
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: false })
  @Index('idx_revocation_status') // Named index for revocation status
  isRevoked: boolean;

  @Column({ default: '', nullable: false })
  deviceInfo: string;

  @Column({ name: 'user_id' })
  @Index('idx_user_id_relation') // Named index for user ID
  userId: string;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}