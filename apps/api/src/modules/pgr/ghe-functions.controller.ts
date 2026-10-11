import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { GheFunctionsService } from "./ghe-functions.service";
import { CreateGheFunctionDto, UpdateGheFunctionDto } from "./dto/pgr.dto";

@Controller("pgr/ghe-functions")
export class GheFunctionsController {
  constructor(private readonly gheFunctions: GheFunctionsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PGR_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("gheId") gheId: string) {
    return this.gheFunctions.list(user.tenantId, gheId);
  }

  @Post()
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateGheFunctionDto) {
    return this.gheFunctions.create(user.tenantId, dto, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  update(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: UpdateGheFunctionDto) {
    return this.gheFunctions.update(user.tenantId, id, dto, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.gheFunctions.remove(user.tenantId, id, user.assignments);
  }
}
