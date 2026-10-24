import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { PositionsService } from "./positions.service";
import { AddPositionExamsDto, CreatePositionDto, ImportFromPositionDto, ImportPositionsDto, LinkPositionRisksDto } from "./dto/org.dto";

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

  @Post("import")
  @RequirePermission(PERMISSIONS.ORG_POSITION_WRITE)
  importPositions(@CurrentUser() user: HydraRequestUser, @Body() dto: ImportPositionsDto) {
    return this.positions.importPositions(user.tenantId, dto, user.assignments);
  }

  @Post("link-risks")
  @RequirePermission(PERMISSIONS.ORG_POSITION_WRITE)
  linkRisks(@CurrentUser() user: HydraRequestUser, @Body() dto: LinkPositionRisksDto) {
    return this.positions.linkRisks(user.tenantId, dto, user.assignments);
  }

  @Delete(":id/risks")
  @RequirePermission(PERMISSIONS.ORG_POSITION_WRITE)
  clearRisks(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.positions.clearRisks(user.tenantId, id, user.assignments);
  }

  @Delete(":id/risks/:hazardId")
  @RequirePermission(PERMISSIONS.ORG_POSITION_WRITE)
  removeRisk(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Param("hazardId") hazardId: string) {
    return this.positions.removeRisk(user.tenantId, id, hazardId, user.assignments);
  }

  @Post(":id/import-risks")
  @RequirePermission(PERMISSIONS.ORG_POSITION_WRITE)
  importRisks(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: ImportFromPositionDto) {
    return this.positions.importRisks(user.tenantId, id, dto.sourcePositionId, user.assignments);
  }

  @Post(":id/exams")
  @RequirePermission(PERMISSIONS.ORG_POSITION_WRITE)
  addExams(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: AddPositionExamsDto) {
    return this.positions.addExams(user.tenantId, id, dto.names, user.assignments);
  }

  @Delete(":id/exams")
  @RequirePermission(PERMISSIONS.ORG_POSITION_WRITE)
  clearExams(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.positions.clearExams(user.tenantId, id, user.assignments);
  }

  @Delete(":id/exams/:examId")
  @RequirePermission(PERMISSIONS.ORG_POSITION_WRITE)
  removeExam(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Param("examId") examId: string) {
    return this.positions.removeExam(user.tenantId, id, examId, user.assignments);
  }

  @Post(":id/import-exams")
  @RequirePermission(PERMISSIONS.ORG_POSITION_WRITE)
  importExams(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: ImportFromPositionDto) {
    return this.positions.importExams(user.tenantId, id, dto.sourcePositionId, user.assignments);
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
