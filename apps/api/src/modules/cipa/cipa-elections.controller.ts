import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { CipaElectionsService } from "./cipa-elections.service";
import { CreateCipaElectionDto, ToggleCipaScheduleStepDto, UpdateCipaElectionDto } from "./dto/cipa-election.dto";

@Controller("cipa/elections")
export class CipaElectionsController {
  constructor(private readonly elections: CipaElectionsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.CIPA_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("companyId") companyId?: string) {
    return this.elections.list(user.tenantId, user.assignments, companyId);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.CIPA_READ)
  get(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.elections.get(user.tenantId, id, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.CIPA_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateCipaElectionDto) {
    return this.elections.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.CIPA_WRITE)
  update(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: UpdateCipaElectionDto) {
    return this.elections.update(user.tenantId, id, dto, user.assignments);
  }

  @Patch(":id/schedule/:stepId")
  @RequirePermission(PERMISSIONS.CIPA_WRITE)
  toggleStep(
    @CurrentUser() user: HydraRequestUser,
    @Param("id") id: string,
    @Param("stepId") stepId: string,
    @Body() dto: ToggleCipaScheduleStepDto,
  ) {
    return this.elections.toggleStep(user.tenantId, id, stepId, dto.concluido, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.CIPA_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.elections.remove(user.tenantId, id, user.assignments);
  }
}
