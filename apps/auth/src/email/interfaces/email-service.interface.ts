/**
 * Interface for the email service that handles sending emails
 */
export interface IEmailService {
  /**
   * Sends a verification email to the specified address
   * @param to The recipient's email address
   * @param token The verification token
   * @returns Promise resolving when the email is sent
   */
  sendVerificationEmail(to: string, token: string): Promise<void>;

  /**
   * Sends a password reset email to the specified address
   * @param to The recipient's email address
   * @param token The reset token
   * @returns Promise resolving when the email is sent
   */
  sendResetPasswordEmail(to: string, token: string): Promise<void>;

  /**
   * Tests the connection to the email server
   * @returns Promise resolving to a boolean indicating connection success
   */
  testMailtrapConnection(): Promise<boolean>;

  /**
   * Gets the email server configuration
   * @returns The email configuration object
   */
  getMailtrapConfig(): {
    host: string;
    port: number;
    user: string;
    pass: string;
  };
} 