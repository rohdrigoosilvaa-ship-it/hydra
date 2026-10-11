import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { PositionsService } from "./positions.service";
import { CreatePositionDto } from "./dto/org.dto";

@Controller("positions")
export class PositionsController {
  constructor(private readonly positions: PositionsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ORG_POSITION_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("companyId") companyId?: string) {
    return this.positions.list(user.tenantId, user.assignments, companyId);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.ORG_POSITION_READ)
  get(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.positions.get(user.tenantId, id, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.ORG_POSITION_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreatePositionDto) {
    return this.positions.create(user.tenantId, dto, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.ORG_POSITION_WRITE)
  update(
    @CurrentUser() user: HydraRequestUser,
    @Param("id") id: string,
    @Body() dto: Partial<CreatePositionDto>,
  ) {
    return this.positions.update(user.tenantId, id, dto, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.ORG_POSITION_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.positions.remove(user.tenantId, id, user.assignments);
  }
}
