import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { EsocialService } from "./esocial.service";
import { CreateEsocialEventDto } from "./dto/esocial.dto";

@Controller("esocial/events")
export class EsocialController {
  constructor(private readonly esocial: EsocialService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ESOCIAL_READ)
  list(@CurrentUser() user: HydraRequestUser) {
    return this.esocial.list(user.tenantId, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.ESOCIAL_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateEsocialEventDto) {
    return this.esocial.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Post(":id/transmit")
  @RequirePermission(PERMISSIONS.ESOCIAL_TRANSMIT)
  transmit(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.esocial.transmit(user.tenantId, id, user.assignments);
  }
}
