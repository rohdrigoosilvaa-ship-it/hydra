import { Body, Controller, Delete, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { PgrCronogramaService } from "./pgr-cronograma.service";
import {
  CreatePgrCronogramaItemDto,
  TogglePgrCronogramaMarkDto,
  UpdatePgrCronogramaItemDto,
} from "./dto/pgr.dto";

/** A leitura do cronograma vem embutida em GET /pgr/:id — aqui só escrita. */
@Controller("pgr")
export class PgrCronogramaController {
  constructor(private readonly cronograma: PgrCronogramaService) {}

  @Post(":pgrId/cronograma")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  create(
    @CurrentUser() user: HydraRequestUser,
    @Param("pgrId") pgrId: string,
    @Body() dto: CreatePgrCronogramaItemDto,
  ) {
    return this.cronograma.create(user.tenantId, pgrId, dto, user.assignments);
  }

  @Patch("cronograma/:itemId")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  update(
    @CurrentUser() user: HydraRequestUser,
    @Param("itemId") itemId: string,
    @Body() dto: UpdatePgrCronogramaItemDto,
  ) {
    return this.cronograma.update(user.tenantId, itemId, dto, user.assignments);
  }

  @Delete("cronograma/:itemId")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("itemId") itemId: string) {
    return this.cronograma.remove(user.tenantId, itemId, user.assignments);
  }

  @Post("cronograma/:itemId/toggle")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  toggle(
    @CurrentUser() user: HydraRequestUser,
    @Param("itemId") itemId: string,
    @Body() dto: TogglePgrCronogramaMarkDto,
  ) {
    return this.cronograma.toggleMark(user.tenantId, itemId, dto, user.assignments);
  }
}
