import { Controller, Get } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { EpiCatalogService } from "./epi-catalog.service";

@Controller("epi/catalog")
export class EpiCatalogController {
  constructor(private readonly catalog: EpiCatalogService) {}

  @Get()
  @RequirePermission(PERMISSIONS.EPI_READ)
  list(@CurrentUser() user: HydraRequestUser) {
    return this.catalog.list(user.tenantId);
  }
}
