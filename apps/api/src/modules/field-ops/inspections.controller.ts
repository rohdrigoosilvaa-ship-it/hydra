import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { InspectionsService } from "./inspections.service";
import { CreateInspectionDto, UpdateInspectionDto, UpsertInspectionResponseDto } from "./dto/field-ops.dto";

@Controller("field-ops/inspections")
export class InspectionsController {
  constructor(private readonly inspections: InspectionsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.OCCURRENCE_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("companyId") companyId?: string) {
    return this.inspections.list(user.tenantId, user.assignments, companyId);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.OCCURRENCE_READ)
  get(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.inspections.get(user.tenantId, id, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateInspectionDto) {
    return this.inspections.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  update(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: UpdateInspectionDto) {
    return this.inspections.update(user.tenantId, id, dto, user.assignments);
  }

  @Post(":id/responses")
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  upsertResponse(
    @CurrentUser() user: HydraRequestUser,
    @Param("id") id: string,
    @Body() dto: UpsertInspectionResponseDto,
  ) {
    return this.inspections.upsertResponse(user.tenantId, id, dto, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.inspections.remove(user.tenantId, id, user.assignments);
  }
}
