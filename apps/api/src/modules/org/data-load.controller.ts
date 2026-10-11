import { BadRequestException, Controller, Get, Post, Query, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { DataLoadService } from "./data-load.service";
import { buildDataLoadTemplate } from "./data-load.util";

/**
 * Carga de dados em lote (Empresa → Unidade → Setor → Cargo → Funcionário) a partir de uma
 * única planilha. Cada linha é conferida contra o escopo do usuário dentro do service.
 */
@Controller("data-load")
export class DataLoadController {
  constructor(private readonly dataLoad: DataLoadService) {}

  @Get("template")
  @RequirePermission(PERMISSIONS.ORG_BRANCH_WRITE)
  template(@Res() res: Response) {
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="Carga_Dados.xlsx"');
    res.send(buildDataLoadTemplate());
  }

  /** `dryRun=true` só valida e mostra o resultado; `dryRun=false` grava. */
  @Post()
  @RequirePermission(PERMISSIONS.ORG_BRANCH_WRITE)
  @UseInterceptors(FileInterceptor("file"))
  async load(
    @CurrentUser() user: HydraRequestUser,
    @Query("dryRun") dryRun: string | undefined,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("Envie a planilha de carga (.xlsx).");
    return this.dataLoad.run(user.tenantId, user.id, user.assignments, file.buffer, dryRun !== "false", file.originalname);
  }
}
