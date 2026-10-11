import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import type { AccessTokenPayload, HydraRequestUser } from "../auth/jwt.types";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException("Token de acesso ausente.");
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      const user: HydraRequestUser = {
        id: payload.sub,
        tenantId: payload.tenantId,
        email: payload.email,
        assignments: payload.assignments,
      };
      request.hydraUser = user;
      return true;
    } catch {
      throw new UnauthorizedException("Token de acesso inválido ou expirado.");
    }
  }
}

function extractBearerToken(header?: string): string | undefined {
  if (!header) return undefined;
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" ? token : undefined;
}
