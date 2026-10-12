import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { InspectionTemplatesService } from "./inspection-templates.service";
import {
  CreateInspectionTemplateDto,
  ReplaceChecklistStructureDto,
  UpdateInspectionTemplateDto,
  UpdateInspectionTemplateItemDto,
} from "./dto/field-ops.dto";

@Controller("field-ops/inspection-templates")
export class InspectionTemplatesController {
  constructor(private readonly templates: InspectionTemplatesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.OCCURRENCE_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("companyId") companyId?: string) {
    return this.templates.list(user.tenantId, user.assignments, companyId);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.OCCURRENCE_READ)
  get(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.templates.get(user.tenantId, id, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateInspectionTemplateDto) {
    return this.templates.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  update(
    @CurrentUser() user: HydraRequestUser,
    @Param("id") id: string,
    @Body() dto: UpdateInspectionTemplateDto,
  ) {
    return this.templates.update(user.tenantId, id, dto, user.assignments);
  }

  @Put(":id/structure")
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  replaceStructure(
    @CurrentUser() user: HydraRequestUser,
    @Param("id") id: string,
    @Body() dto: ReplaceChecklistStructureDto,
  ) {
    return this.templates.replaceStructure(user.tenantId, id, dto, user.assignments);
  }

  @Patch(":id/items/:itemId")
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  updateItem(
    @CurrentUser() user: HydraRequestUser,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateInspectionTemplateItemDto,
  ) {
    return this.templates.updateItem(user.tenantId, id, itemId, dto, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.OCCURRENCE_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.templates.remove(user.tenantId, id, user.assignments);
  }
}
