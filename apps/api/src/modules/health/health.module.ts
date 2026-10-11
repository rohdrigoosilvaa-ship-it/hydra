import { Module } from "@nestjs/common";
import { PcmsoController } from "./pcmso.controller";
import { PcmsoService } from "./pcmso.service";
import { MedicalExamsController } from "./medical-exams.controller";
import { MedicalExamsService } from "./medical-exams.service";
import { AsoController } from "./aso.controller";
import { AsoService } from "./aso.service";

@Module({
  controllers: [PcmsoController, MedicalExamsController, AsoController],
  providers: [PcmsoService, MedicalExamsService, AsoService],
})
export class HealthModule {}
