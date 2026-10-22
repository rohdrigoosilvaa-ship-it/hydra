import { BadRequestException, Body, Controller, Param, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { EvaluationCriteria, ExposureType, RiskCategory } from "@hydra/db";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequirePermission } from "../../core/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { HydraRequestUser } from "../../core/auth/jwt.types";
import { PgrRisksImportService } from "./pgr-risks-import.service";
import { ConfirmRiskImportDto, ImportRiskRowDto } from "./dto/pgr-risks-import.dto";
import type { ParsedRiskImportRow } from "./pgr-risks-import.util";

const RISK_CATEGORIES: RiskCategory[] = ["FISICO", "QUIMICO", "BIOLOGICO", "ERGONOMICO", "ACIDENTE"];
const EXPOSURE_TYPES: ExposureType[] = ["HABITUAL", "EVENTUAL", "INTERMITENTE", "PERMANENTE"];
const EVALUATION_CRITERIA: EvaluationCriteria[] = ["QUALITATIVO", "QUANTITATIVO"];

/** As linhas voltam do preview (que já as validou) — só remonta os tipos
 * enum-ish que o JSON solto não preserva. */
function toParsedRow(dto: ImportRiskRowDto): ParsedRiskImportRow {
  return {
    ...dto,
    sheetName: dto.sheetName ?? "",
    category: (RISK_CATEGORIES as string[]).includes(dto.category ?? "") ? (dto.category as RiskCategory) : null,
    exposureType: (EXPOSURE_TYPES as string[]).includes(dto.exposureType ?? "") ? (dto.exposureType as ExposureType) : undefined,
    evaluationCriteria: (EVALUATION_CRITERIA as string[]).includes(dto.evaluationCriteria ?? "")
      ? (dto.evaluationCriteria as EvaluationCriteria)
      : undefined,
  };
}

@Controller("pgr/risks-import")
export class PgrRisksImportController {
  constructor(private readonly importService: PgrRisksImportService) {}

  @Post(":pgrId/preview")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  @UseInterceptors(FileInterceptor("file"))
  async preview(
    @CurrentUser() user: HydraRequestUser,
    @Param("pgrId") pgrId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("Envie um arquivo .xlsx.");
    const { rows, sheetsFound, sheetsIgnored } = this.importService.parseFile(file.buffer);
    if (sheetsFound.length === 0) {
      throw new BadRequestException(
        'Não encontrei nenhuma aba reconhecível (Físico, Químico, Biológico, Ergonômico ou Acidente) com as colunas do modelo.',
      );
    }
    const result = await this.importService.preview(user.tenantId, pgrId, user.assignments, rows, file.originalname);
    return { ...result, sheetsFound, sheetsIgnored };
  }

  @Post(":pgrId/confirm")
  @RequirePermission(PERMISSIONS.PGR_WRITE)
  async confirm(
    @CurrentUser() user: HydraRequestUser,
    @Param("pgrId") pgrId: string,
    @Body() dto: ConfirmRiskImportDto,
  ) {
    return this.importService.confirm(
      user.tenantId,
      pgrId,
      user.assignments,
      dto.rows.map(toParsedRow),
      user.id,
      dto.fileName,
    );
  }
}
