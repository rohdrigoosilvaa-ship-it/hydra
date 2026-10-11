import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { CrmService } from "./crm.service";
import { CreateCrmLeadDto, CreateCrmTaskDto, UpdateCrmLeadStageDto } from "./dto/crm.dto";

@Controller("crm")
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get("leads")
  @RequirePermission(PERMISSIONS.CRM_READ)
  listLeads(@CurrentUser() user: HydraRequestUser) {
    return this.crm.listLeads(user.tenantId);
  }

  @Post("leads")
  @RequirePermission(PERMISSIONS.CRM_WRITE)
  createLead(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateCrmLeadDto) {
    return this.crm.createLead(user.tenantId, dto, user.id);
  }

  @Patch("leads/:id/stage")
  @RequirePermission(PERMISSIONS.CRM_WRITE)
  updateStage(
    @CurrentUser() user: HydraRequestUser,
    @Param("id") id: string,
    @Body() dto: UpdateCrmLeadStageDto,
  ) {
    return this.crm.updateStage(user.tenantId, id, dto.stage);
  }

  @Post("tasks")
  @RequirePermission(PERMISSIONS.CRM_WRITE)
  createTask(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateCrmTaskDto) {
    return this.crm.createTask(user.tenantId, dto);
  }

  @Patch("tasks/:id/complete")
  @RequirePermission(PERMISSIONS.CRM_WRITE)
  completeTask(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.crm.completeTask(user.tenantId, id);
  }
}
