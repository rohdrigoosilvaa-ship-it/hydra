import { Body, Controller, Delete, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { InvolvedPeopleService } from "./involved-people.service";
import { CreateInvolvedPersonDto } from "./dto/occurrence.dto";

@Controller("occurrences/involved-people")
export class InvolvedPeopleController {
  constructor(private readonly involvedPeople: InvolvedPeopleService) {}

  @Post()
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateInvolvedPersonDto) {
    return this.involvedPeople.create(user.tenantId, dto, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.involvedPeople.remove(user.tenantId, id, user.assignments);
  }
}
