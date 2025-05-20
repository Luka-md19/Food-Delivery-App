import { Restaurant, RestaurantProps } from '../../entities/restaurant.entity';

export interface RestaurantRepository {
  create(restaurant: Restaurant): Promise<Restaurant>;
  findById(restaurantId: string): Promise<Restaurant>;
  findAll(query?: Partial<RestaurantProps>): Promise<Restaurant[]>;
  update(restaurantId: string, data: Partial<RestaurantProps>): Promise<Restaurant>;
  delete(restaurantId: string): Promise<void>;
  save(restaurant: Restaurant): Promise<Restaurant>;
  count(query?: Partial<RestaurantProps>): Promise<number>;
} 