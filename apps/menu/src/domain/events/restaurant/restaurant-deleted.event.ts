export class RestaurantDeletedEvent {
  constructor(public readonly payload: { id: string }) {}
} 