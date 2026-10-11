import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { LtcatService } from "./ltcat.service";
import { LtcatPdfService } from "./ltcat-pdf.service";
import { CreateLtcatDto, UpdateLtcatDto } from "./dto/documents.dto";

@Controller("ltcat")
export class LtcatController {
  constructor(
    private readonly ltcat: LtcatService,
    private readonly ltcatPdf: LtcatPdfService,
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.LTCAT_READ)
  list(@CurrentUser() user: HydraRequestUser, @Query("companyId") companyId?: string) {
    return this.ltcat.list(user.tenantId, user.assignments, companyId);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.LTCAT_READ)
  get(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.ltcat.get(user.tenantId, id, user.assignments);
  }

  @Post()
  @RequirePermission(PERMISSIONS.LTCAT_WRITE)
  create(@CurrentUser() user: HydraRequestUser, @Body() dto: CreateLtcatDto) {
    return this.ltcat.create(user.tenantId, dto, user.id, user.assignments);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.LTCAT_WRITE)
  update(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Body() dto: UpdateLtcatDto) {
    return this.ltcat.update(user.tenantId, id, dto, user.id, user.assignments);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.LTCAT_WRITE)
  remove(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.ltcat.remove(user.tenantId, id, user.id, user.assignments);
  }

  @Post(":id/approve")
  @RequirePermission(PERMISSIONS.LTCAT_APPROVE)
  approve(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.ltcat.approve(user.tenantId, id, user.id, user.assignments);
  }

  @Post(":id/import-ghe-from-pgr")
  @RequirePermission(PERMISSIONS.LTCAT_WRITE)
  importGheFromPgr(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.ltcat.importGheFromPgr(user.tenantId, id, user.assignments);
  }

  @Post(":id/copy-ghe-from-previous-ltcat")
  @RequirePermission(PERMISSIONS.LTCAT_WRITE)
  copyGheFromPreviousLtcat(@CurrentUser() user: HydraRequestUser, @Param("id") id: string) {
    return this.ltcat.copyGheFromPreviousLtcat(user.tenantId, id, user.assignments);
  }

  @Get(":id/pdf")
  @RequirePermission(PERMISSIONS.LTCAT_READ)
  async downloadPdf(@CurrentUser() user: HydraRequestUser, @Param("id") id: string, @Res() res: Response) {
    const { buffer, filename } = await this.ltcatPdf.generate(user.tenantId, id, user.assignments);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length,
    });
    res.send(buffer);
  }
}
