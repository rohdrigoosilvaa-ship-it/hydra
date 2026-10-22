import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { HazardsService } from "./hazards.service";
import { CreateHazardDto, UpdateHazardDto } from "./dto/pgr.dto";

@Controller("pgr/hazards")
export class HazardsController {
  constructor(private readonly hazards: HazardsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PGR_READ)
  list(@CurrentUser() user: HydraRequestUser) {
    return this.hazards.list(user.tenantId);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.PGR_READ)
  get(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.hazards.get(user.tenantId, id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateHazardDto) {
    return this.hazards.create(user.tenantId, dto);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  update(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: UpdateHazardDto) {
    return this.hazards.update(user.tenantId, id, dto);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.hazards.remove(user.tenantId, id);
  }
}
