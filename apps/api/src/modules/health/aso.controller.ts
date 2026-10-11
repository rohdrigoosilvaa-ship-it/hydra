import { Body, Controller, Get, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { AsoService } from "./aso.service";
import { CreateAsoDto } from "./dto/health.dto";

@Controller("health/asos")
export class AsoController {
  constructor(private readonly asos: AsoService) {}

  @Get()
  @RequirePermission(PERMISSIONS.HEALTH_READ)
  list(@CurrentUser() user: HydraRequestUser) {
    return this.asos.list(user.tenantId, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.HEALTH_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateAsoDto) {
    return this.asos.create(user.tenantId, dto, user.assignments);
  }
}
