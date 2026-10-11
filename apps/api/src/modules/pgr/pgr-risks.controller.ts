import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { PgrRisksService } from "./pgr-risks.service";
import { CreatePgrRiskDto, UpdatePgrRiskDto } from "./dto/pgr.dto";

@Controller("pgr/risks")
export class PgrRisksController {
  constructor(private readonly risks: PgrRisksService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PGR_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("pgrId") pgrId?: string) {
    return this.risks.list(user.tenantId, user.assignments, pgrId);
  }

  @Post()
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreatePgrRiskDto) {
    return this.risks.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  update(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: UpdatePgrRiskDto) {
    return this.risks.update(user.tenantId, id, dto, user.id, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.risks.remove(user.tenantId, id, user.assignments);
  }
}
