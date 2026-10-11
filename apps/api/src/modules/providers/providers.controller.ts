import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { ProvidersService } from "./providers.service";
import { CreateProviderDto, RequestProviderContractDto } from "./dto/providers.dto";

@Controller("hydranet")
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get("providers")
  @RequirePermission(PERMISSIONS.PROVIDER_READ)
  list(@CurrentUser() user: HydraRequestUser) {
    return this.providers.list(user.tenantId);
  }

  @Post("providers")
  @RequirePermission(PERMISSIONS.PROVIDER_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateProviderDto) {
    return this.providers.create(user.tenantId, dto);
  }

  @Get("contracts")
  @RequirePermission(PERMISSIONS.PROVIDER_READ)
  listContracts(@CurrentUser() user: HydraRequestUser) {
    return this.providers.listContracts(user.tenantId, user.assignments);
  }

  @Post("contracts")
  @RequirePermission(PERMISSIONS.PROVIDER_WRITE)
  requestContract(@CurrentUser() user: HydraRequestUser, @Body() dto: RequestProviderContractDto) {
    return this.providers.requestContract(user.tenantId, dto, user.id, user.assignments);
  }

  @Post("contracts/:id/activate")
  @RequirePermission(PERMISSIONS.PROVIDER_WRITE)
  activateContract(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.providers.activateContract(user.tenantId, id, user.assignments);
  }
}
