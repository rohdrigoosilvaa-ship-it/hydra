import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { MedicalExamsService } from "./medical-exams.service";
import { CreateMedicalExamDto, SyncAdmissionsDto, UpdateMedicalExamDto } from "./dto/health.dto";

@Controller("health/exams")
export class MedicalExamsController {
  constructor(private readonly exams: MedicalExamsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.HEALTH_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("employeeId") employeeId?: string, @Query("companyId") companyId?: string) {
    return this.exams.list(user.tenantId, user.assignments, employeeId, companyId);
  }

  @Post()
  @RequirePermission(PERMISSIONS.HEALTH_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateMedicalExamDto) {
    return this.exams.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Post("sync-admissions")
  @RequirePermission(PERMISSIONS.HEALTH_WRITE)
  syncAdmissions(@CurrentUser() user: HydraRequestUser, @Body() dto: SyncAdmissionsDto) {
    return this.exams.syncAdmissions(user.tenantId, dto.companyId, user.id, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.HEALTH_WRITE)
  update(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: UpdateMedicalExamDto) {
    return this.exams.update(user.tenantId, id, dto, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.HEALTH_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.exams.remove(user.tenantId, id, user.assignments);
  }
}
