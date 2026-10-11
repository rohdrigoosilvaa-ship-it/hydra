import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { OccurrencesService } from "./occurrences.service";
import { CreateOccurrenceDto, UpdateOccurrenceDto } from "./dto/occurrence.dto";

@Controller("occurrences")
export class OccurrencesController {
  constructor(private readonly occurrences: OccurrencesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.OCCURRENCE_READ)
  list(@CurrentUser() user: HydraRequestUser) {
    return this.occurrences.list(user.tenantId, user.assignments);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.OCCURRENCE_READ)
  get(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.occurrences.get(user.tenantId, id, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateOccurrenceDto) {
    return this.occurrences.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  update(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: UpdateOccurrenceDto) {
    return this.occurrences.update(user.tenantId, id, dto, user.id, user.assignments);
  }
}
