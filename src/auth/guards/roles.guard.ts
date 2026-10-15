import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Vérifie que l'utilisateur connecté possède l'un des rôles requis
 * par le décorateur @Roles(...) sur la route.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Pas de rôle requis : accès libre (pour les utilisateurs connectés)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!user?.role || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Accès réservé aux administrateurs');
    }

    return true;
  }
}
