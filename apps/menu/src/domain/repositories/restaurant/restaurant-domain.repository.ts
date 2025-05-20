import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RestaurantDocument } from '../../../schemas';
import { RestaurantNotFoundException } from '../../exceptions/restaurant';
import { Restaurant, RestaurantProps } from '../../entities/restaurant.entity';
import { RestaurantRepository } from './restaurant.repository';

// Simple debug helper - avoids external import
const debug = (message: string, ...args: any[]) => {
  console.debug(`[RestaurantDomainRepository] ${message}`, ...args);
};

@Injectable()
export class RestaurantDomainRepository implements RestaurantRepository {
  constructor(
    @InjectModel('Restaurant')
    private readonly restaurantModel: Model<RestaurantDocument>,
  ) {
  }

  private async publishEvents(restaurant: Restaurant): Promise<void> {
    const events = restaurant.getUncommittedEvents();
    debug(`Publishing ${events.length} events`);
    
    if (events.length > 0) {
      // Publish events
      for (const event of events) {
        debug(`Publishing event: ${event.constructor.name}`);
        // Here you would normally publish the event to an event bus
      }
      
      // Clear the events that have been published
      restaurant.commit();
    }
  }

  async create(restaurant: Restaurant): Promise<Restaurant> {
    debug('Creating restaurant');
    try {
      const created = await this.restaurantModel.create(restaurant.toObject());
      
      // Create a new entity with the saved data
      const newRestaurant = Restaurant.fromPersistence({
        ...created.toObject(),
        _id: created._id.toString(),
      });
      
      await this.publishEvents(restaurant);
      debug('Restaurant created successfully', created._id);
      
      return newRestaurant;
    } catch (error) {
      debug('Error creating restaurant', error);
      throw error;
    }
  }

  async findById(restaurantId: string): Promise<Restaurant> {
    debug('Finding restaurant by id:', restaurantId);
    try {
      const restaurant = await this.restaurantModel.findById(restaurantId).exec();
      
      if (!restaurant) {
        debug('Restaurant not found:', restaurantId);
        throw new RestaurantNotFoundException(restaurantId);
      }
      
      debug('Restaurant found:', restaurantId);
      
      return Restaurant.fromPersistence(restaurant);
    } catch (error) {
      debug('Error finding restaurant:', error);
      if (error instanceof RestaurantNotFoundException) {
        throw error;
      }
      throw new Error(`Error finding restaurant: ${error.message}`);
    }
  }

  async findAll(query?: Partial<RestaurantProps>): Promise<Restaurant[]> {
    debug('Finding all restaurants with query:', query);
    try {
      const dbQuery = query || {};
      
      // Only include active restaurants by default, unless explicitly queried
      if (dbQuery.active === undefined) {
        dbQuery.active = true;
      }
      
      const restaurants = await this.restaurantModel.find(dbQuery).exec();
      
      debug(`Found ${restaurants.length} restaurants`);
      
      return restaurants.map(restaurant => Restaurant.fromPersistence(restaurant));
    } catch (error) {
      debug('Error finding restaurants:', error);
      throw new Error(`Error finding restaurants: ${error.message}`);
    }
  }

  async count(query?: Partial<RestaurantProps>): Promise<number> {
    debug('Counting restaurants with query:', query);
    try {
      const dbQuery = query || {};
      
      // Only include active restaurants by default, unless explicitly queried
      if (dbQuery.active === undefined) {
        dbQuery.active = true;
      }
      
      const count = await this.restaurantModel.countDocuments(dbQuery).exec();
      
      debug(`Counted ${count} restaurants`);
      
      return count;
    } catch (error) {
      debug('Error counting restaurants:', error);
      throw new Error(`Error counting restaurants: ${error.message}`);
    }
  }

  async update(restaurantId: string, data: Partial<RestaurantProps>): Promise<Restaurant> {
    debug('Updating restaurant:', restaurantId);
    try {
      // Find the restaurant first to ensure it exists
      const existingRestaurant = await this.findById(restaurantId);
      
      // Update the entity with new data
      existingRestaurant.update(data);
      
      // Save to DB
      return await this.save(existingRestaurant);
    } catch (error) {
      debug('Error updating restaurant:', error);
      if (error instanceof RestaurantNotFoundException) {
        throw error;
      }
      throw new Error(`Error updating restaurant: ${error.message}`);
    }
  }

  async delete(restaurantId: string): Promise<void> {
    debug('Deleting restaurant:', restaurantId);
    try {
      // Find the restaurant first to ensure it exists
      const restaurant = await this.findById(restaurantId);
      
      // Mark as deleted in domain entity and publish events
      restaurant.markAsDeleted();
      await this.publishEvents(restaurant);
      
      // Perform the actual deletion
      const result = await this.restaurantModel.findByIdAndDelete(restaurantId).exec();
      
      if (!result) {
        debug('Restaurant not found for deletion:', restaurantId);
        throw new RestaurantNotFoundException(restaurantId);
      }
      
      debug('Restaurant deleted successfully:', restaurantId);
    } catch (error) {
      debug('Error deleting restaurant:', error);
      if (error instanceof RestaurantNotFoundException) {
        throw error;
      }
      throw new Error(`Error deleting restaurant: ${error.message}`);
    }
  }

  async save(restaurant: Restaurant): Promise<Restaurant> {
    debug('Saving restaurant:', restaurant.id);
    try {
      const updated = await this.restaurantModel.findByIdAndUpdate(
        restaurant.id,
        { $set: restaurant.toObject() },
        { new: true },
      ).exec();
      
      if (!updated) {
        debug('Restaurant not found for update:', restaurant.id);
        throw new RestaurantNotFoundException(restaurant.id);
      }
      
      // Publish domain events
      await this.publishEvents(restaurant);
      
      debug('Restaurant saved successfully:', restaurant.id);
      
      return Restaurant.fromPersistence(updated);
    } catch (error) {
      debug('Error saving restaurant:', error);
      if (error instanceof RestaurantNotFoundException) {
        throw error;
      }
      throw new Error(`Error saving restaurant: ${error.message}`);
    }
  }
}