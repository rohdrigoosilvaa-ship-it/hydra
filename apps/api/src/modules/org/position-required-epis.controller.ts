import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { PositionRequiredEpisService } from "./position-required-epis.service";
import { CreatePositionRequiredEpiDto, UpdatePositionRequiredEpiDto } from "./dto/position-required-epi.dto";

@Controller("positions/:positionId/required-epis")
export class PositionRequiredEpisController {
  constructor(private readonly requiredEpis: PositionRequiredEpisService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ORG_POSITION_READ)
  list(@CurrentUser() user: HydraRequestUser, @Param("positionId") positionId: string) {
    return this.requiredEpis.list(user.tenantId, positionId, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.ORG_POSITION_WRITE)
  create(
    @CurrentUser() user: HydraRequestUser,
    @Param("positionId") positionId: string,
    @Body() dto: CreatePositionRequiredEpiDto,
  ) {
    return this.requiredEpis.create(user.tenantId, positionId, dto, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.ORG_POSITION_WRITE)
  update(
    @CurrentUser() user: HydraRequestUser,
    @Param("positionId") positionId: string,
    @Param("id") id: string,
    @Body() dto: UpdatePositionRequiredEpiDto,
  ) {
    return this.requiredEpis.update(user.tenantId, positionId, id, dto, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.ORG_POSITION_WRITE)
  remove(
    @CurrentUser() user: HydraRequestUser,
    @Param("positionId") positionId: string,
    @Param("id") id: string,
  ) {
    return this.requiredEpis.remove(user.tenantId, positionId, id, user.assignments);
  }
}
