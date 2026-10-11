import { Body, Controller, Get, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { FapRecordsService } from "./fap-records.service";
import { CreateFapRecordDto } from "./dto/previdenciario.dto";

@Controller("previdenciario/fap")
export class FapRecordsController {
  constructor(private readonly fap: FapRecordsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PREV_READ)
  list(@CurrentUser() user: HydraRequestUser) {
    return this.fap.list(user.tenantId, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.PREV_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateFapRecordDto) {
    return this.fap.create(user.tenantId, dto, user.assignments);
  }
}
