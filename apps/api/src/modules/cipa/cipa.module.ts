import { Module } from "@nestjs/common";
import { CipaController } from "./cipa.controller";
import { CipaService } from "./cipa.service";
import { CipaElectionsController } from "./cipa-elections.controller";
import { CipaElectionsService } from "./cipa-elections.service";

@Module({
  controllers: [CipaController, CipaElectionsController],
  providers: [CipaService, CipaElectionsService],
})
export class CipaModule {}
