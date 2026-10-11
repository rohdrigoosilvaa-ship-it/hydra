import { Module } from "@nestjs/common";
import { CboController } from "./cbo.controller";
import { CboService } from "./cbo.service";

@Module({
  controllers: [CboController],
  providers: [CboService],
})
export class CboModule {}
