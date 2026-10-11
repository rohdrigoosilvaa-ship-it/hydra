import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { EmployeesService } from "./employees.service";
import { CreateEmployeeDto } from "./dto/org.dto";

@Controller("employees")
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ORG_EMPLOYEE_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("companyId") companyId?: string) {
    return this.employees.list(user.tenantId, user.assignments, companyId);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.ORG_EMPLOYEE_READ)
  get(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.employees.get(user.tenantId, id, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.ORG_EMPLOYEE_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateEmployeeDto) {
    return this.employees.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.ORG_EMPLOYEE_WRITE)
  update(
    @CurrentUser() user: HydraRequestUser,
    @Param("id") id: string,
    @Body() dto: Partial<CreateEmployeeDto>,
  ) {
    return this.employees.update(user.tenantId, id, dto, user.id, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.ORG_EMPLOYEE_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.employees.remove(user.tenantId, id, user.id, user.assignments);
  }
}
