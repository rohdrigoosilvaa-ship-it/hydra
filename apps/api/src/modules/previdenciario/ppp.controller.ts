import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { PppService } from "./ppp.service";
import { CreatePppDto } from "./dto/previdenciario.dto";

@Controller("ppp")
export class PppController {
  constructor(private readonly ppp: PppService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PPP_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("employeeId") employeeId?: string) {
    return this.ppp.list(user.tenantId, user.assignments, employeeId);
  }

  @Post()
  @RequirePermission(PERMISSIONS.PPP_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreatePppDto) {
    return this.ppp.create(user.tenantId, dto, user.id, user.assignments);
  }
}
