// apps/auth/src/polyfills.ts
import * as crypto from 'crypto';

// Ensure that the global crypto object is defined for Node.js v18 and above.
if (!(global as any).crypto) {
  (global as any).crypto = crypto;
}
