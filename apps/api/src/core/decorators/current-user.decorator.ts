import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { HydraRequestUser } from "../auth/jwt.types";

/** Injeta o usuário autenticado (ver AuthGuard) no handler do controller. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): HydraRequestUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.hydraUser;
  },
);
