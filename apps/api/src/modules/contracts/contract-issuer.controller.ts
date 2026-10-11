import { Body, Controller, Get, Put } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { ContractIssuerService } from "./contract-issuer.service";
import { UpsertContractIssuerDto } from "./dto/contract.dto";

@Controller("contracts/issuer")
export class ContractIssuerController {
  constructor(private readonly issuer: ContractIssuerService) {}

  @Get()
  @RequirePermission(PERMISSIONS.CONTRACT_READ)
  get(@CurrentUser() user: HydraRequestUser) {
    return this.issuer.get(user.tenantId);
  }

  @Put()
  @RequirePermission(PERMISSIONS.CONTRACT_WRITE)
  upsert(@CurrentUser() user: HydraRequestUser, @Body() dto: UpsertContractIssuerDto) {
    return this.issuer.upsert(user.tenantId, dto);
  }
}
