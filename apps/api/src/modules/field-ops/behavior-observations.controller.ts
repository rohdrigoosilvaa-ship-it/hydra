import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { BehaviorObservationsService } from "./behavior-observations.service";
import { CreateBehaviorObservationDto } from "./dto/field-ops.dto";

@Controller("field-ops/behavior-observations")
export class BehaviorObservationsController {
  constructor(private readonly observations: BehaviorObservationsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.OCCURRENCE_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("companyId") companyId?: string) {
    return this.observations.list(user.tenantId, user.assignments, companyId);
  }

  @Post()
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateBehaviorObservationDto) {
    return this.observations.create(user.tenantId, dto, user.id, user.assignments);
  }
}
