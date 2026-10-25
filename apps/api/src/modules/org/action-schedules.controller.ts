import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { ActionSchedulesService } from "./action-schedules.service";
import { SaveActionScheduleDto, SetActionScheduleModeDto } from "./dto/action-schedules.dto";

@Controller("action-schedules")
export class ActionSchedulesController {
  constructor(private readonly schedules: ActionSchedulesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ORG_COMPANY_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("companyId") companyId: string) {
    return this.schedules.list(user.tenantId, companyId, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.ORG_COMPANY_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: SaveActionScheduleDto) {
    return this.schedules.create(user.tenantId, dto, user.assignments);
  }

  @Put(":id")
  @RequirePermission(PERMISSIONS.ORG_COMPANY_WRITE)
  update(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: SaveActionScheduleDto) {
    return this.schedules.update(user.tenantId, id, dto, user.assignments);
  }

  @Patch(":id/mode")
  @RequirePermission(PERMISSIONS.ORG_COMPANY_WRITE)
  setMode(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: SetActionScheduleModeDto) {
    return this.schedules.setMode(user.tenantId, id, dto.mode, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.ORG_COMPANY_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.schedules.remove(user.tenantId, id, user.assignments);
  }
}
