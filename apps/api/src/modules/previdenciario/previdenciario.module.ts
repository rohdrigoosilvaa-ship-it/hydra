import { Module } from "@nestjs/common";
import { AbsencesController } from "./absences.controller";
import { AbsencesService } from "./absences.service";
import { FapRecordsController } from "./fap-records.controller";
import { FapRecordsService } from "./fap-records.service";
import { PppController } from "./ppp.controller";
import { PppService } from "./ppp.service";

@Module({
  controllers: [AbsencesController, FapRecordsController, PppController],
  providers: [AbsencesService, FapRecordsService, PppService],
})
export class PrevidenciarioModule {}
