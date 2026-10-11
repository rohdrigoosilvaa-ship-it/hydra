import { Controller, Get } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { PendenciasService } from "./pendencias.service";

@Controller("pendencias")
export class PendenciasController {
  constructor(private readonly pendencias: PendenciasService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PGR_READ)
  list(@CurrentUser() user: HydraRequestUser) {
    return this.pendencias.getPendencias(user.tenantId, user.assignments);
  }
}
