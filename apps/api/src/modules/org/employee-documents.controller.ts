import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { EmployeeDocumentsService } from "./employee-documents.service";
import { CreateEmployeeDocumentDto } from "./dto/employee-documents.dto";

@Controller("employee-documents")
export class EmployeeDocumentsController {
  constructor(private readonly documents: EmployeeDocumentsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.EMPLOYEE_DOCUMENT_READ)
  list(
    @CurrentUser() user: HydraRequestUser,
    @Query("employeeId") employeeId?: string,
    @Query("companyId") companyId?: string,
  ) {
    return this.documents.list(user.tenantId, user.assignments, employeeId, companyId);
  }

  @Post()
  @RequirePermission(PERMISSIONS.EMPLOYEE_DOCUMENT_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateEmployeeDocumentDto) {
    return this.documents.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.EMPLOYEE_DOCUMENT_WRITE)
  update(
    @CurrentUser() user: HydraRequestUser,
    @Param("id") id: string,
    @Body() dto: Partial<CreateEmployeeDocumentDto>,
  ) {
    return this.documents.update(user.tenantId, id, dto, user.id, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.EMPLOYEE_DOCUMENT_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.documents.remove(user.tenantId, id, user.assignments);
  }
}
