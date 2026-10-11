import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { UnitsService } from "./units.service";
import { CreateUnitDto } from "./dto/org.dto";

@Controller("units")
export class UnitsController {
  constructor(private readonly units: UnitsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ORG_UNIT_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("branchId") branchId?: string) {
    return this.units.list(user.tenantId, user.assignments, branchId);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.ORG_UNIT_READ)
  get(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.units.get(user.tenantId, id, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.ORG_UNIT_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateUnitDto) {
    return this.units.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.ORG_UNIT_WRITE)
  update(
    @CurrentUser() user: HydraRequestUser,
    @Param("id") id: string,
    @Body() dto: Partial<CreateUnitDto>,
  ) {
    return this.units.update(user.tenantId, id, dto, user.id, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.ORG_UNIT_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.units.remove(user.tenantId, id, user.id, user.assignments);
  }
}
