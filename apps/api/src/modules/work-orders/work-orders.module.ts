import { Module } from "@nestjs/common";
import { WorkOrdersController } from "./work-orders.controller";
import { WorkOrdersService } from "./work-orders.service";
import { WorkOrderPdfService } from "./work-order-pdf.service";
import { WorkOrderSignaturesController } from "./work-order-signatures.controller";
import { WorkOrderSigningPublicController } from "./work-order-signing-public.controller";
import { WorkOrderSignaturesService } from "./work-order-signatures.service";

@Module({
  controllers: [WorkOrdersController, WorkOrderSignaturesController, WorkOrderSigningPublicController],
  providers: [WorkOrdersService, WorkOrderPdfService, WorkOrderSignaturesService],
})
export class WorkOrdersModule {}
