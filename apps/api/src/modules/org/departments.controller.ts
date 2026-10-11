import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { DepartmentsService } from "./departments.service";
import { CreateDepartmentDto } from "./dto/org.dto";

@Controller("departments")
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ORG_DEPARTMENT_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("companyId") companyId?: string) {
    return this.departments.list(user.tenantId, user.assignments, companyId);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.ORG_DEPARTMENT_READ)
  get(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.departments.get(user.tenantId, id, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.ORG_DEPARTMENT_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateDepartmentDto) {
    return this.departments.create(user.tenantId, dto, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.ORG_DEPARTMENT_WRITE)
  update(
    @CurrentUser() user: HydraRequestUser,
    @Param("id") id: string,
    @Body() dto: Partial<CreateDepartmentDto>,
  ) {
    return this.departments.update(user.tenantId, id, dto, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.ORG_DEPARTMENT_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.departments.remove(user.tenantId, id, user.assignments);
  }
}
