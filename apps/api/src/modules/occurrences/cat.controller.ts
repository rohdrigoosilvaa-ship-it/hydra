import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { CatService } from "./cat.service";
import { CreateCatDto } from "./dto/occurrence.dto";

@Controller("occurrences/cat")
export class CatController {
  constructor(private readonly catService: CatService) {}

  @Get()
  @RequirePermission(PERMISSIONS.OCCURRENCE_READ)
  list(@CurrentUser() user: HydraRequestUser) {
    return this.catService.list(user.tenantId, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateCatDto) {
    return this.catService.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Post(":id/send")
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  send(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.catService.send(user.tenantId, id, user.assignments);
  }
}
