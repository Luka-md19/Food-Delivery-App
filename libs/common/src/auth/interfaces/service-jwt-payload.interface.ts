export interface ServiceJwtPayload {
  serviceId: string;
  serviceName: string;
  permissions: string[];
  iat?: number;
  exp?: number;
} 