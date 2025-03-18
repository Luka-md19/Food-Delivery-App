import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export interface IMenu extends Document {
  restaurantId: string;
  name: string;
  description?: string;
  active: boolean;
  availability?: {
    daysOfWeek: number[];
    startTime?: string;
    endTime?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}