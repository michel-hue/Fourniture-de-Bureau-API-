import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Restreint une route aux rôles indiqués (ex: @Roles('admin')). */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
