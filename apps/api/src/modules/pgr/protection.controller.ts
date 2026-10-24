import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import type { ProtectionKind } from "@hydra/db";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { ProtectionService } from "./protection.service";
import { CreateProtectionCategoryDto, CreateProtectionEquipmentDto } from "./dto/pgr.dto";

const asKind = (k?: string): ProtectionKind | undefined => (k === "EPC" || k === "EPI" ? k : undefined);

@Controller("pgr/protection")
export class ProtectionController {
  constructor(private readonly protection: ProtectionService) {}

  @Get("categories")
  @RequirePermission(PERMISSIONS.PGR_READ)
  categories(@CurrentUser() user: HydraRequestUser, @Query("kind") kind?: string) {
    return this.protection.listCategories(user.tenantId, asKind(kind));
  }

  @Post("categories")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  createCategory(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateProtectionCategoryDto) {
    return this.protection.createCategory(user.tenantId, dto);
  }

  @Get("equipment")
  @RequirePermission(PERMISSIONS.PGR_READ)
  equipment(@CurrentUser() user: HydraRequestUser, @Query("kind") kind?: string) {
    return this.protection.listEquipment(user.tenantId, asKind(kind));
  }

  @Post("equipment")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  createEquipment(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateProtectionEquipmentDto) {
    return this.protection.createEquipment(user.tenantId, dto);
  }
}
