import { Module } from "@nestjs/common";
import { HazardsController } from "./hazards.controller";
import { HazardsService } from "./hazards.service";
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
import { PgrAiController } from "./pgr-ai.controller";
import { PgrAiService } from "./pgr-ai.service";
import { PgrRisksImportController } from "./pgr-risks-import.controller";
import { PgrRisksImportService } from "./pgr-risks-import.service";
import { PgrCronogramaController } from "./pgr-cronograma.controller";
import { PgrCronogramaService } from "./pgr-cronograma.service";

@Module({
  controllers: [
    HazardsController,
    PgrCronogramaController,
    PgrController,
    GheController,
    GheFunctionsController,
    PgrRisksController,
    PgrActionsController,
    PgrAiController,
    PgrRisksImportController,
  ],
  providers: [
    HazardsService,
    PgrService,
    PgrPdfService,
    GheService,
    GheFunctionsService,
    PgrRisksService,
    PgrActionsService,
    PgrAiService,
    PgrRisksImportService,
    PgrCronogramaService,
  ],
})
export class PgrModule {}
