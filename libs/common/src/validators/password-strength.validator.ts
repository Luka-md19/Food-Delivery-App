import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
  } from 'class-validator';
  
  export function PasswordStrength(validationOptions?: ValidationOptions) {
    return (object: Object, propertyName: string) => {
      registerDecorator({
        name: 'PasswordStrength',
        target: object.constructor,
        propertyName: propertyName,
        options: validationOptions,
        validator: {
          validate(value: any, args: ValidationArguments): boolean {
            if (typeof value !== 'string') return false;
            // Require at least one lowercase, one uppercase, one digit, and one special character.
            const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).+$/;
            return regex.test(value);
          },
          defaultMessage(args: ValidationArguments): string {
            return 'Password must scontain at least one uppercase letter, one lowercase letter, one number, and one special character';
          },
        },
      });
    };
  }
  