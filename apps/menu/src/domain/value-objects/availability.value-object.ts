/**
 * Interface for the availability in persistence layer
 */
export interface AvailabilityData {
  daysOfWeek: number[];
  startTime?: string;
  endTime?: string;
}

/**
 * Availability value object representing when a menu is available
 */
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

  /**
   * Check if the menu is available on a specific day
   * @param day Day number (0-6, where 0 is Sunday)
   * @returns true if available on this day
   */
  public isAvailableOnDay(day: number): boolean {
    return this._daysOfWeek.includes(day);
  }

  /**
   * Check if the menu is available at a specific time
   * @param time Time string in format HH:MM
   * @returns true if available at this time
   */
  public isAvailableAtTime(time: string): boolean {
    if (!this._startTime || !this._endTime) {
      return true; // If no time restrictions, it's available
    }

    return time >= this._startTime && time <= this._endTime;
  }

  /**
   * Factory method to create from persistence data
   * @param data Availability data from persistence layer
   * @returns New Availability value object
   */
  public static fromPersistence(data: AvailabilityData | undefined): Availability {
    if (!data) {
      return new Availability([]);
    }
    
    return new Availability(
      data.daysOfWeek || [],
      data.startTime,
      data.endTime
    );
  }

  /**
   * Convert to persistence format
   * @returns Data object for persistence
   */
  public toPersistence(): AvailabilityData {
    return {
      daysOfWeek: this._daysOfWeek,
      startTime: this._startTime,
      endTime: this._endTime
    };
  }

  /**
   * Create a new Availability with updated days of week
   * @param daysOfWeek New days of week array
   * @returns New Availability instance
   */
  public withDaysOfWeek(daysOfWeek: number[]): Availability {
    return new Availability(daysOfWeek, this._startTime, this._endTime);
  }

  /**
   * Create a new Availability with updated time range
   * @param startTime New start time
   * @param endTime New end time
   * @returns New Availability instance
   */
  public withTimeRange(startTime?: string, endTime?: string): Availability {
    return new Availability(this._daysOfWeek, startTime, endTime);
  }

  /**
   * Check equality with another Availability instance
   * @param other Another Availability to compare with
   * @returns true if objects are equal
   */
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