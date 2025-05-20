import { RestaurantProps } from '../../entities/restaurant.entity';

export class RestaurantUpdatedEvent {
  constructor(public readonly restaurant: RestaurantProps) {}
} 