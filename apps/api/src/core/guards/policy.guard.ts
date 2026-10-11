import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { PERMISSION_KEY } from "../decorators/require-permission.decorator";
import { roleGrants, type Permission } from "../permissions/permissions";
import type { HydraRequestUser } from "../auth/jwt.types";

/**
 * Segunda camada, depois do AuthGuard: um endpoint sem @RequirePermission
 * só exige estar autenticado. Um endpoint com @RequirePermission exige que
 * ALGUM vínculo (role assignment) do usuário no tenant atual conceda a
 * permissão — o recorte fino por escopo (empresa/filial/unidade) é feito
 * no service, na hora de montar o WHERE da query (ver EmployeesService).
 */
@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const permission = this.reflector.getAllAndOverride<Permission | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!permission) return true;

    const request = context.switchToHttp().getRequest();
    const user: HydraRequestUser | undefined = request.hydraUser;
    if (!user) return false;

    const granted = user.assignments.some((a) => roleGrants(a.role, permission));
    if (!granted) {
      throw new ForbiddenException(
        `Seu perfil não tem a permissão "${permission}" nesta empresa.`,
      );
    }
    return true;
  }
}
