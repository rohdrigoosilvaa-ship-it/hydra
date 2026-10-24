import { Module } from "@nestjs/common";
import { CnaeController } from "./cnae.controller";
import { CnaeService } from "./cnae.service";

@Module({
  controllers: [CnaeController],
  providers: [CnaeService],
})
export class CnaeModule {}
