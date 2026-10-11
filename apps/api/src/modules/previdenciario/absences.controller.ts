import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { AbsencesService } from "./absences.service";
import { CreateAbsenceDto } from "./dto/previdenciario.dto";

@Controller("previdenciario/absences")
export class AbsencesController {
  constructor(private readonly absences: AbsencesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PREV_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("employeeId") employeeId?: string) {
    return this.absences.list(user.tenantId, user.assignments, employeeId);
  }

  @Post()
  @RequirePermission(PERMISSIONS.PREV_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateAbsenceDto) {
    return this.absences.create(user.tenantId, dto, user.id, user.assignments);
  }
}
