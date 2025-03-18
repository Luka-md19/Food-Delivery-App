import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FailedMessageDocument = FailedMessage & Document;

@Schema({
  timestamps: true,
  collection: 'failed_messages',
  versionKey: 'version',
})
export class FailedMessage {
  @Prop({ required: true, index: true })
  pattern: string;

  @Prop({ required: true, type: Object })
  payload: Record<string, any>;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop({ default: false, index: true })
  processed: boolean;

  @Prop({ type: Object })
  lastError?: Record<string, any>;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop({ default: 0 })
  version: number;
}

export const FailedMessageSchema = SchemaFactory.createForClass(FailedMessage);

// Add indexes for common query patterns
FailedMessageSchema.index({ pattern: 1, processed: 1 });
FailedMessageSchema.index({ createdAt: 1 }); 