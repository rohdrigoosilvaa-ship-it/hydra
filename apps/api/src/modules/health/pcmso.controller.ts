import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { PcmsoService } from "./pcmso.service";
import { CreatePcmsoDto } from "./dto/health.dto";

@Controller("health/pcmso")
export class PcmsoController {
  constructor(private readonly pcmso: PcmsoService) {}

  @Get()
  @RequirePermission(PERMISSIONS.HEALTH_READ)
  list(@CurrentUser() user: HydraRequestUser) {
    return this.pcmso.list(user.tenantId, user.assignments);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.HEALTH_READ)
  get(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.pcmso.get(user.tenantId, id, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.HEALTH_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreatePcmsoDto) {
    return this.pcmso.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Post(":id/approve")
  @RequirePermission(PERMISSIONS.HEALTH_WRITE)
  approve(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.pcmso.approve(user.tenantId, id, user.id, user.assignments);
  }
}
