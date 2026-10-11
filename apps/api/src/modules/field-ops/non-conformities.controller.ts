import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { NonConformitiesService } from "./non-conformities.service";
import { CreateNonConformityDto, UpdateNonConformityStatusDto } from "./dto/field-ops.dto";

@Controller("field-ops/non-conformities")
export class NonConformitiesController {
  constructor(private readonly nonConformities: NonConformitiesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.OCCURRENCE_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("companyId") companyId?: string) {
    return this.nonConformities.list(user.tenantId, user.assignments, companyId);
  }

  @Post()
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateNonConformityDto) {
    return this.nonConformities.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Patch(":id/status")
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  updateStatus(
    @CurrentUser() user: HydraRequestUser,
    @Param("id") id: string,
    @Body() dto: UpdateNonConformityStatusDto,
  ) {
    return this.nonConformities.updateStatus(user.tenantId, id, dto.status, user.assignments);
  }
}
