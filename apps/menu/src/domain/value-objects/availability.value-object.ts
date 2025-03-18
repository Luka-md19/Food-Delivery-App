export class Availability {
  private readonly _daysOfWeek: number[];
  private readonly _startTime?: string;
  private readonly _endTime?: string;

  constructor(daysOfWeek: number[], startTime?: string, endTime?: string) {
    // Validate days of week (0-6, where 0 is Sunday)
    this._daysOfWeek = daysOfWeek.filter(day => day >= 0 && day <= 6);
    this._startTime = startTime;
    this._endTime = endTime;
  }

  get daysOfWeek(): number[] {
    return [...this._daysOfWeek]; // Return a copy to prevent direct modification
  }

  get startTime(): string | undefined {
    return this._startTime;
  }

  get endTime(): string | undefined {
    return this._endTime;
  }

  // Check if the menu is available on a specific day
  public isAvailableOnDay(day: number): boolean {
    return this._daysOfWeek.includes(day);
  }

  // Check if the menu is available at a specific time
  public isAvailableAtTime(time: string): boolean {
    if (!this._startTime || !this._endTime) {
      return true; // If no time restrictions, it's available
    }

    return time >= this._startTime && time <= this._endTime;
  }

  // Factory method to create from persistence
  public static fromPersistence(data: any): Availability {
    return new Availability(
      data.daysOfWeek || [],
      data.startTime,
      data.endTime
    );
  }

  // Convert to persistence format
  public toPersistence(): any {
    return {
      daysOfWeek: this._daysOfWeek,
      startTime: this._startTime,
      endTime: this._endTime
    };
  }

  // Value objects should be immutable, so we need methods to create new instances
  public withDaysOfWeek(daysOfWeek: number[]): Availability {
    return new Availability(daysOfWeek, this._startTime, this._endTime);
  }

  public withTimeRange(startTime?: string, endTime?: string): Availability {
    return new Availability(this._daysOfWeek, startTime, endTime);
  }

  // Value objects should implement equals method
  public equals(other: Availability): boolean {
    if (!(other instanceof Availability)) {
      return false;
    }

    // Check if days of week are the same (order doesn't matter)
    const daysEqual = 
      this._daysOfWeek.length === other._daysOfWeek.length &&
      this._daysOfWeek.every(day => other._daysOfWeek.includes(day));

    return (
      daysEqual &&
      this._startTime === other._startTime &&
      this._endTime === other._endTime
    );
  }
} 