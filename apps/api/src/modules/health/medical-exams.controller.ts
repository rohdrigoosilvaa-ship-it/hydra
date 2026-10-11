import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { MedicalExamsService } from "./medical-exams.service";
import { CreateMedicalExamDto } from "./dto/health.dto";

@Controller("health/exams")
export class MedicalExamsController {
  constructor(private readonly exams: MedicalExamsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.HEALTH_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("employeeId") employeeId?: string) {
    return this.exams.list(user.tenantId, user.assignments, employeeId);
  }

  @Post()
  @RequirePermission(PERMISSIONS.HEALTH_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateMedicalExamDto) {
    return this.exams.create(user.tenantId, dto, user.id, user.assignments);
  }
}
