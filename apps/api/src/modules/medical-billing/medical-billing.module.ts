import { Module } from "@nestjs/common";
import { MedicalBillingController } from "./medical-billing.controller";
import { MedicalBillingService } from "./medical-billing.service";

@Module({
  controllers: [MedicalBillingController],
  providers: [MedicalBillingService],
})
export class MedicalBillingModule {}
