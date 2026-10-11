import { Module } from "@nestjs/common";
import { EpiCatalogController } from "./epi-catalog.controller";
import { EpiCatalogService } from "./epi-catalog.service";
import { EpiDeliveriesController } from "./epi-deliveries.controller";
import { EpiDeliveriesService } from "./epi-deliveries.service";
import { EpiPdfService } from "./epi-pdf.service";
import { EpiSignaturesController } from "./epi-signatures.controller";
import { EpiSigningPublicController } from "./epi-signing-public.controller";
import { EpiSignaturesService } from "./epi-signatures.service";

@Module({
  controllers: [EpiCatalogController, EpiDeliveriesController, EpiSignaturesController, EpiSigningPublicController],
  providers: [EpiCatalogService, EpiDeliveriesService, EpiPdfService, EpiSignaturesService],
})
export class EpiModule {}
