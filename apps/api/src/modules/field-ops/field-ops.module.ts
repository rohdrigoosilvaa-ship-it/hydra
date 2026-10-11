import { Module } from "@nestjs/common";
import { InspectionTemplatesController } from "./inspection-templates.controller";
import { InspectionTemplatesService } from "./inspection-templates.service";
import { InspectionBlocksController } from "./inspection-blocks.controller";
import { InspectionBlocksService } from "./inspection-blocks.service";
import { InspectionsController } from "./inspections.controller";
import { InspectionsService } from "./inspections.service";
import { NonConformitiesController } from "./non-conformities.controller";
import { NonConformitiesService } from "./non-conformities.service";
import { EvidenceController } from "./evidence.controller";
import { EvidenceService } from "./evidence.service";
import { BehaviorObservationsController } from "./behavior-observations.controller";
import { BehaviorObservationsService } from "./behavior-observations.service";

@Module({
  controllers: [
    InspectionTemplatesController,
    InspectionBlocksController,
    InspectionsController,
    NonConformitiesController,
    EvidenceController,
    BehaviorObservationsController,
  ],
  providers: [
    InspectionTemplatesService,
    InspectionBlocksService,
    InspectionsService,
    NonConformitiesService,
    EvidenceService,
    BehaviorObservationsService,
  ],
})
export class FieldOpsModule {}
