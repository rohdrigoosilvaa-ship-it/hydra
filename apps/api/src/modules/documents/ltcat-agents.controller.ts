import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { LtcatAgentsService } from "./ltcat-agents.service";
import { CreateLtcatAgentDto, UpdateLtcatAgentDto } from "./dto/documents.dto";

@Controller("ltcat/agents")
export class LtcatAgentsController {
  constructor(private readonly agents: LtcatAgentsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.LTCAT_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("ltcatId") ltcatId?: string) {
    return this.agents.list(user.tenantId, user.assignments, ltcatId);
  }

  @Post()
  @RequirePermission(PERMISSIONS.LTCAT_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateLtcatAgentDto) {
    return this.agents.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.LTCAT_WRITE)
  update(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: UpdateLtcatAgentDto) {
    return this.agents.update(user.tenantId, id, dto, user.id, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.LTCAT_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.agents.remove(user.tenantId, id, user.assignments);
  }
}
