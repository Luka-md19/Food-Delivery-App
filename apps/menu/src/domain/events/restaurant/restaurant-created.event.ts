import { RestaurantProps } from '../../entities/restaurant.entity';

export class RestaurantCreatedEvent {
  constructor(public readonly restaurant: RestaurantProps) {}
} 