import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { PgrService } from "./pgr.service";
import { PgrPdfService } from "./pgr-pdf.service";
import { CreatePgrDto, UpdatePgrDto } from "./dto/pgr.dto";

@Controller("pgr")
export class PgrController {
  constructor(
    private readonly pgrService: PgrService,
    private readonly pgrPdfService: PgrPdfService,
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.PGR_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("companyId") companyId?: string) {
    return this.pgrService.list(user.tenantId, user.assignments, companyId);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.PGR_READ)
  get(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.pgrService.get(user.tenantId, id, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreatePgrDto) {
    return this.pgrService.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  update(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: UpdatePgrDto) {
    return this.pgrService.update(user.tenantId, id, dto, user.id, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.pgrService.remove(user.tenantId, id, user.id, user.assignments);
  }

  @Post(":id/approve")
  @RequirePermission(PERMISSIONS.PGR_APPROVE)
  approve(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.pgrService.approve(user.tenantId, id, user.id, user.assignments);
  }

  @Get(":id/pdf")
  @RequirePermission(PERMISSIONS.PGR_READ)
  async downloadPdf(
    @CurrentUser() user: HydraRequestUser,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.pgrPdfService.generate(user.tenantId, id, user.assignments);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length,
    });
    res.send(buffer);
  }
}
