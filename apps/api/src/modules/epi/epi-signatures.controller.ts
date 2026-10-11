import { Controller, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { EpiSignaturesService } from "./epi-signatures.service";

@Controller("epi/deliveries")
export class EpiSignaturesController {
  constructor(private readonly signatures: EpiSignaturesService) {}

  @Post(":id/signatures/link")
  @RequirePermission(PERMISSIONS.EPI_WRITE)
  requestSigningLink(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.signatures.requestSigningLink(user.tenantId, id, user.assignments);
  }
}
