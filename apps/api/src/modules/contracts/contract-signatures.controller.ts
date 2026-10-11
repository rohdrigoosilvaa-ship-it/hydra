import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { ContractSignaturesService } from "./contract-signatures.service";
import { SignContractDto } from "./dto/contract-signature.dto";

@Controller("contracts")
export class ContractSignaturesController {
  constructor(private readonly signatures: ContractSignaturesService) {}

  @Post(":id/signatures/contratante/link")
  @RequirePermission(PERMISSIONS.CONTRACT_WRITE)
  requestContratanteLink(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.signatures.requestContratanteLink(user.tenantId, id, user.assignments);
  }

  @Post(":id/signatures/contratada/sign")
  @RequirePermission(PERMISSIONS.CONTRACT_WRITE)
  signAsContratada(
    @CurrentUser() user: HydraRequestUser,
    @Param("id") id: string,
    @Body() dto: SignContractDto,
    @Req() req: Request,
  ) {
    return this.signatures.signAsContratada(user.tenantId, id, dto, user.assignments, user.id, req.ip, req.headers["user-agent"]);
  }

  @Get(":id/signatures")
  @RequirePermission(PERMISSIONS.CONTRACT_READ)
  getStatus(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.signatures.getStatus(user.tenantId, id, user.assignments);
  }
}
