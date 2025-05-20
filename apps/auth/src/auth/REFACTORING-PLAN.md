# Auth Module Refactoring Plan

## Current Issues

1. **Code Duplication**: Multiple services with overlapping functionality (EmailQueueService/EmailConsumerService)
2. **Unclear Boundaries**: The authentication.service.ts file is too large (561 lines) with many responsibilities
3. **Inconsistent Organization**: Some services are in the root directory, others in a services/ subdirectory
4. **Tangled Dependencies**: The AuthFacade depends on too many services directly

## Progress

### ✅ Email Module Cleanup
- ✅ Merged EmailQueueService and EmailConsumerService into a single service
- ✅ Removed duplicate code between these services
- ✅ Updated module definition to reflect the changes

### ✅ Auth Module Reorganization
#### ✅ Move all services to services/ directory:
- ✅ Moved authentication.service.ts → services/authentication.service.ts
- ✅ Moved service-auth.service.ts → services/service-auth.service.ts
- ✅ Moved social-auth.service.ts → services/social-auth.service.ts

#### Create service interfaces:
- ✅ Added interfaces for service contracts

### Remaining Tasks

#### Split large services:
- Break down authentication.service.ts into smaller focused services:
  - UserAuthService: login, register, basic auth operations
  - TokenManagementService: token generation, validation, refresh
  - PasswordService: password reset, change, etc.

#### Dependency Cleanup
- Update AuthFacade to delegate to appropriate services
- Reduce direct dependencies through better abstraction

#### Ensure consistent error handling
- Review error handling patterns across services
- Standardize error responses

## Implementation Steps

1. ✅ Create the new service structure
2. ✅ Move and refactor code in small, testable increments
3. ✅ Update the module definitions
4. ✅ Update the facade to use the new services
5. Split large services into smaller, focused ones
6. Add comprehensive tests where missing 