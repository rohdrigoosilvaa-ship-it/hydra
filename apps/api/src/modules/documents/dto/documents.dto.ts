import { IsDateString, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import type { RiskCategory, TechnicalReportType } from "@hydra/db";

const REPORT_TYPES: TechnicalReportType[] = [
  "INSALUBRIDADE",
  "PERICULOSIDADE",
  "COMPLEMENTAR",
  "PARECER",
  "ERGONOMICO",
];

const RISK_CATEGORIES: RiskCategory[] = ["FISICO", "QUIMICO", "BIOLOGICO", "ERGONOMICO", "ACIDENTE"];

/** Campos de metadados do documento — mesma paridade do PGR (PgrDocumentFields),
 * compartilhados entre criação e edição, todos opcionais na edição. */
class LtcatDocumentFields {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @IsOptional()
  @IsString()
  responsibleId?: string;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  preparedBy?: string;

  @IsOptional()
  @IsString()
  reviewedBy?: string;

  @IsOptional()
  @IsString()
  approvedBy?: string;

  @IsOptional()
  @IsString()
  companyResponsibleName?: string;

  @IsOptional()
  @IsString()
  companyResponsibleRole?: string;

  @IsOptional()
  @IsString()
  technicalResponsibleName?: string;

  @IsOptional()
  @IsString()
  technicalResponsibleSpecialty?: string;

  @IsOptional()
  @IsString()
  technicalResponsibleRegistry?: string;

  @IsOptional()
  @IsString()
  technicalResponsibleCouncil?: string;

  @IsOptional()
  @IsString()
  technicalResponsibleUf?: string;
}

export class CreateLtcatDto extends LtcatDocumentFields {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  artNumber?: string;
}

export class UpdateLtcatDto extends LtcatDocumentFields {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  artNumber?: string;
}

export class CreateLtcatAgentDto {
  @IsString()
  ltcatId!: string;

  @IsOptional()
  @IsString()
  gheId?: string;

  @IsIn(RISK_CATEGORIES)
  agentCategory!: RiskCategory;

  @IsString()
  @MinLength(2)
  agentName!: string;

  @IsOptional()
  @IsString()
  intensityConcentration?: string;

  @IsOptional()
  @IsString()
  toleranceLimit?: string;

  @IsOptional()
  @IsString()
  measurementMethod?: string;

  @IsOptional()
  @IsString()
  exposureTechnique?: string;

  @IsOptional()
  @IsString()
  effectiveEpi?: string;

  @IsOptional()
  @IsString()
  conclusion?: string;
}

export class UpdateLtcatAgentDto {
  @IsOptional()
  @IsString()
  gheId?: string;

  @IsOptional()
  @IsIn(RISK_CATEGORIES)
  agentCategory?: RiskCategory;

  @IsOptional()
  @IsString()
  @MinLength(2)
  agentName?: string;

  @IsOptional()
  @IsString()
  intensityConcentration?: string;

  @IsOptional()
  @IsString()
  toleranceLimit?: string;

  @IsOptional()
  @IsString()
  measurementMethod?: string;

  @IsOptional()
  @IsString()
  exposureTechnique?: string;

  @IsOptional()
  @IsString()
  effectiveEpi?: string;

  @IsOptional()
  @IsString()
  conclusion?: string;
}

export class CreateTechnicalReportDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsIn(REPORT_TYPES)
  type!: TechnicalReportType;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  responsibleId?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}
