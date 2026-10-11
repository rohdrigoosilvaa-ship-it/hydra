import { Module } from "@nestjs/common";
import { LtcatController } from "./ltcat.controller";
import { LtcatService } from "./ltcat.service";
import { LtcatPdfService } from "./ltcat-pdf.service";
import { LtcatAgentsController } from "./ltcat-agents.controller";
import { LtcatAgentsService } from "./ltcat-agents.service";
import { TechnicalReportsController } from "./technical-reports.controller";
import { TechnicalReportsService } from "./technical-reports.service";

@Module({
  controllers: [LtcatController, LtcatAgentsController, TechnicalReportsController],
  providers: [LtcatService, LtcatPdfService, LtcatAgentsService, TechnicalReportsService],
})
export class DocumentsModule {}
