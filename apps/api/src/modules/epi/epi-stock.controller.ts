import { Body, Controller, Delete, Get, Param, Patch, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { EpiStockService } from "./epi-stock.service";
import { EpiStockPdfService } from "./epi-stock-pdf.service";
import { CreateEpiStockItemDto, UpdateEpiStockItemDto } from "./dto/epi.dto";

@Controller("epi/stock")
export class EpiStockController {
  constructor(
    private readonly stock: EpiStockService,
    private readonly stockPdf: EpiStockPdfService,
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.EPI_READ)
  list(@CurrentUser() user: HydraRequestUser) {
    return this.stock.list(user.tenantId);
  }

  /** Relação de EPIs em estoque, em PDF — declarada antes das rotas com :id. */
  @Get("report/pdf")
  @RequirePermission(PERMISSIONS.EPI_READ)
  async report(@CurrentUser() user: HydraRequestUser, @Res() res: Response) {
    const { buffer, filename } = await this.stockPdf.generate(user.tenantId);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length,
    });
    res.send(buffer);
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
