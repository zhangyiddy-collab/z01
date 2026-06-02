import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '../../database/entities';

export const ADMIN_PUBLIC_KEY = 'adminPublic';
export const ADMIN_ROLES_KEY = 'adminRoles';

export const AdminPublic = () => SetMetadata(ADMIN_PUBLIC_KEY, true);
export const AdminRoles = (...roles: AdminRole[]) => SetMetadata(ADMIN_ROLES_KEY, roles);
