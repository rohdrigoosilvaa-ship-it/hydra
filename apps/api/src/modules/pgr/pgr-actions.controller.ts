import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { PgrActionsService } from "./pgr-actions.service";
import { CreatePgrActionDto, UpdatePgrActionStatusDto } from "./dto/pgr.dto";

@Controller("actions")
export class PgrActionsController {
  constructor(private readonly actions: PgrActionsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PGR_ACTION_READ)
  list(@CurrentUser() user: HydraRequestUser) {
    return this.actions.list(user.tenantId, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.PGR_ACTION_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreatePgrActionDto) {
    return this.actions.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Patch(":id/status")
  @RequirePermission(PERMISSIONS.PGR_ACTION_WRITE)
  updateStatus(
    @CurrentUser() user: HydraRequestUser,
    @Param("id") id: string,
    @Body() dto: UpdatePgrActionStatusDto,
  ) {
    return this.actions.updateStatus(user.tenantId, id, dto.status, user.id, user.assignments);
  }
}
