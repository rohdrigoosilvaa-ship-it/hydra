import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { EpiStockService } from "./epi-stock.service";
import { CreateEpiStockItemDto, UpdateEpiStockItemDto } from "./dto/epi.dto";

@Controller("epi/stock")
export class EpiStockController {
  constructor(private readonly stock: EpiStockService) {}

  @Get()
  @RequirePermission(PERMISSIONS.EPI_READ)
  list(@CurrentUser() user: HydraRequestUser) {
    return this.stock.list(user.tenantId);
  }

  @Post()
  @RequirePermission(PERMISSIONS.EPI_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateEpiStockItemDto) {
    return this.stock.create(user.tenantId, dto, user.id);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.EPI_WRITE)
  update(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: UpdateEpiStockItemDto) {
    return this.stock.update(user.tenantId, id, dto);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.EPI_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.stock.remove(user.tenantId, id);
  }
}
