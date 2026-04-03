import type { Role } from '@prisma/client';

export const ADMIN_ROLES: Role[] = ['PLATFORM_ADMIN'];
export const COMPANY_MANAGEMENT_ROLES: Role[] = ['PLATFORM_ADMIN', 'COMPANY_OWNER', 'COMPANY_MANAGER'];
export const COMPANY_OWNER_ROLES: Role[] = ['PLATFORM_ADMIN', 'COMPANY_OWNER'];
