import { Module } from "@nestjs/common";
import { OccurrencesController } from "./occurrences.controller";
import { OccurrencesService } from "./occurrences.service";
import { InvestigationsController } from "./investigations.controller";
import { InvestigationsService } from "./investigations.service";
import { CatController } from "./cat.controller";
import { CatService } from "./cat.service";
import { InvolvedPeopleController } from "./involved-people.controller";
import { InvolvedPeopleService } from "./involved-people.service";

@Module({
  controllers: [OccurrencesController, InvestigationsController, CatController, InvolvedPeopleController],
  providers: [OccurrencesService, InvestigationsService, CatService, InvolvedPeopleService],
})
export class OccurrencesModule {}
