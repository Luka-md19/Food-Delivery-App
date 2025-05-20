export class MenuDeletedEvent {
  constructor(
    public readonly menuId: string,
    public readonly restaurantId: string
  ) {}
} 