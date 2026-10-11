import { Module } from "@nestjs/common";
import { ContractTemplatesController } from "./contract-templates.controller";
import { ContractTemplatesService } from "./contract-templates.service";
import { ContractIssuerController } from "./contract-issuer.controller";
import { ContractIssuerService } from "./contract-issuer.service";
import { ContractsController } from "./contracts.controller";
import { ContractsService } from "./contracts.service";
import { ContractsPdfService } from "./contracts-pdf.service";
import { ContractSignaturesController } from "./contract-signatures.controller";
import { ContractSigningPublicController } from "./contract-signing-public.controller";
import { ContractSignaturesService } from "./contract-signatures.service";

@Module({
  controllers: [
    ContractTemplatesController,
    ContractIssuerController,
    ContractsController,
    ContractSignaturesController,
    ContractSigningPublicController,
  ],
  providers: [ContractTemplatesService, ContractIssuerService, ContractsService, ContractsPdfService, ContractSignaturesService],
})
export class ContractsModule {}
