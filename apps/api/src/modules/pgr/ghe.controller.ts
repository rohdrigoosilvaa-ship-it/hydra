import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { GheService } from "./ghe.service";
import { CreateGheDto, UpdateGheDto } from "./dto/pgr.dto";

@Controller("pgr/ghe")
export class GheController {
  constructor(private readonly ghe: GheService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PGR_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("pgrId") pgrId?: string) {
    return this.ghe.list(user.tenantId, user.assignments, pgrId);
  }

  @Get("department-summary")
  @RequirePermission(PERMISSIONS.PGR_READ)
  departmentSummary(@CurrentUser() user: HydraRequestUser, @Query("companyId") companyId: string) {
    return this.ghe.departmentSummary(user.tenantId, user.assignments, companyId);
  }

  @Post()
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateGheDto) {
    return this.ghe.create(user.tenantId, dto, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  update(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: UpdateGheDto) {
    return this.ghe.update(user.tenantId, id, dto, user.assignments);
  }
}
