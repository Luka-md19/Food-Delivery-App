/**
 * Parse a time expression like '7d', '30m', '12h' into milliseconds
 * 
 * @param expiration Time expression (e.g. '7d', '30m', '12h')
 * @returns Time in milliseconds
 */
export function parseExpiration(expiration: string): number {
  const value = parseInt(expiration.slice(0, -1), 10);
  const unit = expiration.slice(-1).toLowerCase();
  
  switch (unit) {
    case 'd': // days
      return value * 24 * 60 * 60 * 1000;
    case 'h': // hours
      return value * 60 * 60 * 1000;
    case 'm': // minutes
      return value * 60 * 1000;
    case 's': // seconds
      return value * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000; // Default to 7 days
  }
}

/**
 * Calculate an expiration date from now
 * 
 * @param expiration Time expression (e.g. '7d', '30m', '12h')
 * @returns Date object representing the expiration time
 */
export function calculateExpirationDate(expiration: string): Date {
  const ms = parseExpiration(expiration);
  return new Date(Date.now() + ms);
}

/**
 * Check if a date is expired
 * 
 * @param date Date to check
 * @returns True if date is in the past
 */
export function isExpired(date: Date): boolean {
  return date < new Date();
}

/**
 * Generate a random token
 * 
 * @returns Random string that can be used as a token
 */
export function generateRandomToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
} 