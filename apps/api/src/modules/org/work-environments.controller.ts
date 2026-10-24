import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { WorkEnvironmentsService } from "./work-environments.service";
import { CreateWorkEnvironmentDto, UpdateWorkEnvironmentDto } from "./dto/org.dto";

@Controller("environments")
export class WorkEnvironmentsController {
  constructor(private readonly environments: WorkEnvironmentsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ORG_COMPANY_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("companyId") companyId: string) {
    return this.environments.list(user.tenantId, companyId, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.ORG_COMPANY_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateWorkEnvironmentDto) {
    return this.environments.create(user.tenantId, dto, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.ORG_COMPANY_WRITE)
  update(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: UpdateWorkEnvironmentDto) {
    return this.environments.update(user.tenantId, id, dto, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.ORG_COMPANY_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.environments.remove(user.tenantId, id, user.assignments);
  }
}
