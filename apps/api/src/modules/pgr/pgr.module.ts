import { Module } from "@nestjs/common";
import { HazardsController } from "./hazards.controller";
import { HazardsService } from "./hazards.service";
import { ProtectionController } from "./protection.controller";
import { ProtectionService } from "./protection.service";
import { PgrController } from "./pgr.controller";
import { PgrService } from "./pgr.service";
import { PgrPdfService } from "./pgr-pdf.service";
import { GheController } from "./ghe.controller";
import { GheService } from "./ghe.service";
import { GheFunctionsController } from "./ghe-functions.controller";
import { GheFunctionsService } from "./ghe-functions.service";
import { PgrRisksController } from "./pgr-risks.controller";
import { PgrRisksService } from "./pgr-risks.service";
import { PgrActionsController } from "./pgr-actions.controller";
import { PgrActionsService } from "./pgr-actions.service";
import { PgrValidationController } from "./pgr-validation.controller";
import { PgrValidationService } from "./pgr-validation.service";
import { PgrRisksImportController } from "./pgr-risks-import.controller";
import { PgrRisksImportService } from "./pgr-risks-import.service";
import { PgrCronogramaController } from "./pgr-cronograma.controller";
import { PgrCronogramaService } from "./pgr-cronograma.service";

@Module({
  controllers: [
    HazardsController,
    ProtectionController,
    PgrCronogramaController,
    PgrController,
    GheController,
    GheFunctionsController,
    PgrRisksController,
    PgrActionsController,
    PgrValidationController,
    PgrRisksImportController,
  ],
  providers: [
    HazardsService,
    ProtectionService,
    PgrService,
    PgrPdfService,
    GheService,
    GheFunctionsService,
    PgrRisksService,
    PgrActionsService,
    PgrValidationService,
    PgrRisksImportService,
    PgrCronogramaService,
  ],
})
export class PgrModule {}
