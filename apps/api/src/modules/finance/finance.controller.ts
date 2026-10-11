import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { FinanceService } from "./finance.service";
import { CreateInvoiceDto } from "./dto/finance.dto";

@Controller("finance/invoices")
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get()
  @RequirePermission(PERMISSIONS.FINANCE_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("companyId") companyId?: string) {
    return this.finance.list(user.tenantId, user.assignments, companyId);
  }

  @Post()
  @RequirePermission(PERMISSIONS.FINANCE_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateInvoiceDto) {
    return this.finance.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Post(":id/pay")
  @RequirePermission(PERMISSIONS.FINANCE_WRITE)
  markPaid(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.finance.markPaid(user.tenantId, id, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.FINANCE_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.finance.remove(user.tenantId, id, user.assignments);
  }
}
