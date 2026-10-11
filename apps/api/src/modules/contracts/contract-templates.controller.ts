import { Controller, Get, Param } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { ContractTemplatesService } from "./contract-templates.service";

@Controller("contracts/templates")
export class ContractTemplatesController {
  constructor(private readonly templates: ContractTemplatesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.CONTRACT_READ)
  list(@CurrentUser() user: HydraRequestUser) {
    return this.templates.list(user.tenantId);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.CONTRACT_READ)
  get(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.templates.get(user.tenantId, id);
  }
}
