import { Body, Controller, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { InvestigationsService } from "./investigations.service";
import { CreateInvestigationDto } from "./dto/occurrence.dto";

@Controller("occurrences/investigations")
export class InvestigationsController {
  constructor(private readonly investigations: InvestigationsService) {}

  @Post()
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateInvestigationDto) {
    return this.investigations.create(user.tenantId, dto, user.id, user.assignments);
  }
}
