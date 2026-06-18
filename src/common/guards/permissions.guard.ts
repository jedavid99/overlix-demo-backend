import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { CurrentUserData } from '../decorators/current-user.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as CurrentUserData;

    if (!user || !user.permisos) {
      throw new ForbiddenException('No tienes permisos para realizar esta acción');
    }

    const { modulo, accion } = requiredPermission;
    const userPermissions = user.permisos[modulo];

    if (!userPermissions || !userPermissions.includes(accion)) {
      throw new ForbiddenException(
        `No tienes permiso para ${accion} en el módulo ${modulo}`,
      );
    }

    return true;
  }
}
