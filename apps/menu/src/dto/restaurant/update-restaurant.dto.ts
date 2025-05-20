import { CreateRestaurantDto } from './create-restaurant.dto';
import { PartialType } from '@nestjs/swagger';

export class UpdateRestaurantDto extends PartialType(CreateRestaurantDto) {} 