import { 
  Entity, 
  Column, 
  ManyToOne, 
  PrimaryGeneratedColumn, 
  CreateDateColumn 
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  token: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ default: false })
  isRevoked: boolean;

  @Column({ default: '', nullable: false })
  deviceInfo: string;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  user: User;

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}