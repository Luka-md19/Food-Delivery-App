import { Menu } from '../entities/menu.entity';


export class MenuAvailabilityService {
  /**
   * Determines if a menu is available at the current time
   * @param menu The menu to check
   * @returns boolean indicating if the menu is available
   */
  public isMenuAvailableNow(menu: Menu): boolean {
    if (!menu.active) {
      return false;
    }

    const availability = menu.availability;
    if (!availability) {
      return true; // If no availability restrictions, menu is always available
    }

    const now = new Date();
    const currentDay = now.getDay(); // 0-6, where 0 is Sunday
    
    // Check if menu is available on the current day
    if (!availability.isAvailableOnDay(currentDay)) {
      return false;
    }

    // Check if menu is available at the current time
    const currentTime = now.toTimeString().substring(0, 5); // Format: "HH:MM"
    return availability.isAvailableAtTime(currentTime);
  }

  /**
   * Finds all menus that are available at the current time
   * @param menus Array of menus to filter
   * @returns Array of available menus
   */
  public filterAvailableMenus(menus: Menu[]): Menu[] {
    return menus.filter(menu => this.isMenuAvailableNow(menu));
  }

  /**
   * Checks if a menu will be available at a specific date and time
   * @param menu The menu to check
   * @param date The date and time to check
   * @returns boolean indicating if the menu will be available
   */
  public isMenuAvailableAt(menu: Menu, date: Date): boolean {
    if (!menu.active) {
      return false;
    }

    const availability = menu.availability;
    if (!availability) {
      return true; // If no availability restrictions, menu is always available
    }

    const day = date.getDay(); // 0-6, where 0 is Sunday
    
    // Check if menu is available on the specified day
    if (!availability.isAvailableOnDay(day)) {
      return false;
    }

    // Check if menu is available at the specified time
    const time = date.toTimeString().substring(0, 5); // Format: "HH:MM"
    return availability.isAvailableAtTime(time);
  }
} 