import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./core/prisma/prisma.module";
import { AuthModule } from "./core/auth/auth.module";
import { AuthGuard } from "./core/guards/auth.guard";
import { PolicyGuard } from "./core/guards/policy.guard";
import { OrgModule } from "./modules/org/org.module";
import { PgrModule } from "./modules/pgr/pgr.module";
import { HealthModule } from "./modules/health/health.module";
import { OccurrencesModule } from "./modules/occurrences/occurrences.module";
import { CipaModule } from "./modules/cipa/cipa.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { PrevidenciarioModule } from "./modules/previdenciario/previdenciario.module";
import { EsocialModule } from "./modules/esocial/esocial.module";
import { ProvidersModule } from "./modules/providers/providers.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { CrmModule } from "./modules/crm/crm.module";
import { MedicalBillingModule } from "./modules/medical-billing/medical-billing.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { CboModule } from "./modules/cbo/cbo.module";
import { CnaeModule } from "./modules/cnae/cnae.module";
import { PsychosocialModule } from "./modules/psychosocial/psychosocial.module";
import { Nr01Module } from "./modules/nr01/nr01.module";
import { PendenciasModule } from "./modules/pendencias/pendencias.module";
import { SearchModule } from "./modules/search/search.module";
import { FieldOpsModule } from "./modules/field-ops/field-ops.module";
import { ContractsModule } from "./modules/contracts/contracts.module";
import { EpiModule } from "./modules/epi/epi.module";
import { WorkOrdersModule } from "./modules/work-orders/work-orders.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    OrgModule,
    PgrModule,
    HealthModule,
    OccurrencesModule,
    CipaModule,
    DocumentsModule,
    PrevidenciarioModule,
    EsocialModule,
    ProvidersModule,
    FinanceModule,
    CrmModule,
    MedicalBillingModule,
    DashboardModule,
    CboModule,
    CnaeModule,
    PsychosocialModule,
    Nr01Module,
    PendenciasModule,
    SearchModule,
    FieldOpsModule,
    ContractsModule,
    EpiModule,
    WorkOrdersModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PolicyGuard },
  ],
})
export class AppModule {}
