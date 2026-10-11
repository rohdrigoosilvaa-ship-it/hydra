import { Body, Controller, Get, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { TechnicalReportsService } from "./technical-reports.service";
import { CreateTechnicalReportDto } from "./dto/documents.dto";

@Controller("laudos")
export class TechnicalReportsController {
  constructor(private readonly reports: TechnicalReportsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.REPORT_READ)
  list(@CurrentUser() user: HydraRequestUser) {
    return this.reports.list(user.tenantId, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.REPORT_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateTechnicalReportDto) {
    return this.reports.create(user.tenantId, dto, user.id, user.assignments);
  }
}
