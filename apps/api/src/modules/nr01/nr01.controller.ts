import { Controller, Get, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { Nr01Service } from "./nr01.service";

@Controller("nr01")
export class Nr01Controller {
  constructor(private readonly nr01: Nr01Service) {}

  @Get("overview")
  @RequirePermission(PERMISSIONS.PGR_READ)
  overview(@CurrentUser() user: HydraRequestUser) {
    return this.nr01.getOverview(user.tenantId, user.assignments);
  }

  @Get("inventory")
  @RequirePermission(PERMISSIONS.PGR_READ)
  inventory(@CurrentUser() user: HydraRequestUser, @Query("companyId") companyId?: string) {
    return this.nr01.getInventory(user.tenantId, user.assignments, companyId);
  }

  @Get("ghe")
  @RequirePermission(PERMISSIONS.PGR_READ)
  ghe(@CurrentUser() user: HydraRequestUser, @Query("companyId") companyId?: string) {
    return this.nr01.getGheList(user.tenantId, user.assignments, companyId);
  }
}
