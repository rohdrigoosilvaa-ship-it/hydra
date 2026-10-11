import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { put } from "@vercel/blob";
import { createHash } from "crypto";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { WorkOrdersService } from "./work-orders.service";
import { WorkOrderPdfService } from "./work-order-pdf.service";
import { CreateWorkOrderDto } from "./dto/work-order.dto";

@Controller("work-orders")
export class WorkOrdersController {
  constructor(
    private readonly workOrders: WorkOrdersService,
    private readonly workOrderPdf: WorkOrderPdfService,
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.WORK_ORDER_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("companyId") companyId?: string) {
    return this.workOrders.list(user.tenantId, user.assignments, companyId);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.WORK_ORDER_READ)
  get(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.workOrders.get(user.tenantId, id, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.WORK_ORDER_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateWorkOrderDto) {
    return this.workOrders.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.WORK_ORDER_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.workOrders.remove(user.tenantId, id, user.assignments);
  }

  @Delete(":id/risk-items/:itemId")
  @RequirePermission(PERMISSIONS.WORK_ORDER_WRITE)
  removeRiskItem(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Param("itemId") itemId: string) {
    return this.workOrders.removeRiskItem(user.tenantId, id, itemId, user.assignments);
  }

  @Delete(":id/epi-items/:itemId")
  @RequirePermission(PERMISSIONS.WORK_ORDER_WRITE)
  removeEpiItem(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Param("itemId") itemId: string) {
    return this.workOrders.removeEpiItem(user.tenantId, id, itemId, user.assignments);
  }

  @Post(":id/pdf")
  @RequirePermission(PERMISSIONS.WORK_ORDER_WRITE)
  async generatePdf(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    const { buffer, filename } = await this.workOrderPdf.generate(user.tenantId, id, user.assignments);
    const blob = await put(`work-orders/${user.tenantId}/${id}/${Date.now()}-${filename}`, buffer, {
      access: "public",
      contentType: "application/pdf",
    });
    const pdfSha256 = createHash("sha256").update(buffer).digest("hex");
    return this.workOrders.savePdfUrl(user.tenantId, id, blob.url, pdfSha256);
  }
}
