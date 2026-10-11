import { Controller, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { WorkOrderSignaturesService } from "./work-order-signatures.service";

@Controller("work-orders")
export class WorkOrderSignaturesController {
  constructor(private readonly signatures: WorkOrderSignaturesService) {}

  @Post(":id/signatures/link")
  @RequirePermission(PERMISSIONS.WORK_ORDER_WRITE)
  requestSigningLink(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.signatures.requestSigningLink(user.tenantId, id, user.assignments);
  }
}
