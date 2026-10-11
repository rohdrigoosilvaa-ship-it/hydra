import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { MedicalBillingService } from "./medical-billing.service";
import { CreateMedicalBillDto, GlossMedicalBillDto } from "./dto/medical-billing.dto";

@Controller("medical-billing")
export class MedicalBillingController {
  constructor(private readonly billing: MedicalBillingService) {}

  @Get()
  @RequirePermission(PERMISSIONS.MEDICAL_BILL_READ)
  list(@CurrentUser() user: HydraRequestUser) {
    return this.billing.list(user.tenantId, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.MEDICAL_BILL_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateMedicalBillDto) {
    return this.billing.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Post(":id/approve")
  @RequirePermission(PERMISSIONS.MEDICAL_BILL_APPROVE)
  approve(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.billing.approve(user.tenantId, id, user.assignments);
  }

  @Post(":id/gloss")
  @RequirePermission(PERMISSIONS.MEDICAL_BILL_APPROVE)
  gloss(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: GlossMedicalBillDto) {
    return this.billing.gloss(user.tenantId, id, dto, user.assignments);
  }
}
