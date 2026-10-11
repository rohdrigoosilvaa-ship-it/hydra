import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { InspectionBlocksService } from "./inspection-blocks.service";
import { CreateInspectionBlockDto, UpdateInspectionBlockDto } from "./dto/field-ops.dto";

@Controller("field-ops/inspection-blocks")
export class InspectionBlocksController {
  constructor(private readonly blocks: InspectionBlocksService) {}

  @Get()
  @RequirePermission(PERMISSIONS.OCCURRENCE_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("companyId") companyId?: string) {
    return this.blocks.list(user.tenantId, user.assignments, companyId);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.OCCURRENCE_READ)
  get(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.blocks.get(user.tenantId, id, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateInspectionBlockDto) {
    return this.blocks.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  update(
    @CurrentUser() user: HydraRequestUser,
    @Param("id") id: string,
    @Body() dto: UpdateInspectionBlockDto,
  ) {
    return this.blocks.update(user.tenantId, id, dto, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.blocks.remove(user.tenantId, id, user.assignments);
  }
}
