import { SetMetadata } from '@nestjs/common';

export const SERVICE_PERMISSIONS_KEY = 'servicePermissions';
export const ServicePermissions = (...permissions: string[]) => SetMetadata(SERVICE_PERMISSIONS_KEY, permissions); 