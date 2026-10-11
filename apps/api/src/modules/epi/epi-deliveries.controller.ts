import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { put } from "@vercel/blob";
import { createHash } from "crypto";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { EpiDeliveriesService } from "./epi-deliveries.service";
import { EpiPdfService } from "./epi-pdf.service";
import {
  CreateEpiDeliveryDto,
  CreateEpiDeliveryItemDto,
  UpdateEpiDeliveryDto,
  UpdateEpiDeliveryItemDto,
} from "./dto/epi.dto";

@Controller("epi/deliveries")
export class EpiDeliveriesController {
  constructor(
    private readonly deliveries: EpiDeliveriesService,
    private readonly epiPdf: EpiPdfService,
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.EPI_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("companyId") companyId?: string) {
    return this.deliveries.list(user.tenantId, user.assignments, companyId);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.EPI_READ)
  get(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.deliveries.get(user.tenantId, id, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.EPI_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateEpiDeliveryDto) {
    return this.deliveries.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.EPI_WRITE)
  update(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: UpdateEpiDeliveryDto) {
    return this.deliveries.update(user.tenantId, id, dto, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.EPI_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.deliveries.remove(user.tenantId, id, user.assignments);
  }

  @Post(":id/items")
  @RequirePermission(PERMISSIONS.EPI_WRITE)
  addItem(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: CreateEpiDeliveryItemDto) {
    return this.deliveries.addItem(user.tenantId, id, dto, user.assignments);
  }

  @Patch(":id/items/:itemId")
  @RequirePermission(PERMISSIONS.EPI_WRITE)
  updateItem(
    @CurrentUser() user: HydraRequestUser,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateEpiDeliveryItemDto,
  ) {
    return this.deliveries.updateItem(user.tenantId, id, itemId, dto, user.assignments);
  }

  @Delete(":id/items/:itemId")
  @RequirePermission(PERMISSIONS.EPI_WRITE)
  removeItem(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Param("itemId") itemId: string) {
    return this.deliveries.removeItem(user.tenantId, id, itemId, user.assignments);
  }

  @Post(":id/pdf")
  @RequirePermission(PERMISSIONS.EPI_WRITE)
  async generatePdf(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    const { buffer, filename } = await this.epiPdf.generate(user.tenantId, id, user.assignments);
    const blob = await put(`epi/${user.tenantId}/${id}/${Date.now()}-${filename}`, buffer, {
      access: "public",
      contentType: "application/pdf",
    });
    const pdfSha256 = createHash("sha256").update(buffer).digest("hex");
    return this.deliveries.savePdfUrl(user.tenantId, id, blob.url, pdfSha256);
  }
}
