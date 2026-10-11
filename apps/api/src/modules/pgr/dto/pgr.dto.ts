import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import type { ActionStatus, EvaluationCriteria, ExposureType, RiskCategory } from "@hydra/db";

const RISK_CATEGORIES: RiskCategory[] = ["FISICO", "QUIMICO", "BIOLOGICO", "ERGONOMICO", "ACIDENTE"];
const EXPOSURE_TYPES: ExposureType[] = ["EVENTUAL", "INTERMITENTE", "PERMANENTE"];
const EVALUATION_CRITERIA: EvaluationCriteria[] = ["QUALITATIVO", "QUANTITATIVO"];

export class CreateHazardDto {
  @IsIn(RISK_CATEGORIES)
  category!: RiskCategory;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  damagePotential?: string;

  @IsOptional()
  @IsString()
  esocialCode?: string;
}

export class UpdateHazardDto {
  @IsOptional()
  @IsIn(RISK_CATEGORIES)
  category?: RiskCategory;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  damagePotential?: string;

  @IsOptional()
  @IsString()
  esocialCode?: string;
}

/** Campos de metadados do documento (seções 5, 6, 28, 29 do escopo) — compartilhados
 * entre criação e edição, todos opcionais na edição. */
class PgrDocumentFields {
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

  // Abas "Plano de ações e recomendações" e "Finalização"
  @IsOptional()
  @IsString()
  procedimentoTrabalho?: string;

  @IsOptional()
  @IsString()
  treinamentosNecessarios?: string;

  @IsOptional()
  @IsString()
  episRecomendados?: string;

  @IsOptional()
  @IsString()
  metasPrioridades?: string;

  @IsOptional()
  @IsString()
  consideracoesFinais?: string;
}

export class CreatePgrCronogramaItemDto {
  @IsString()
  @MinLength(2)
  description!: string;

  @IsOptional()
  @IsString()
  responsible?: string;
}

export class UpdatePgrCronogramaItemDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  description?: string;

  @IsOptional()
  @IsString()
  responsible?: string;
}

export class TogglePgrCronogramaMarkDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}

export class CreatePgrDto extends PgrDocumentFields {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  @MinLength(2)
  title!: string;
}

export class UpdatePgrDto extends PgrDocumentFields {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;
}

export class CreateGheDto {
  @IsOptional()
  @IsString()
  pgrId?: string;

  @IsOptional()
  @IsString()
  ltcatId?: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  localDescription?: string;

  @IsOptional()
  @IsString()
  activityDescription?: string;
}

export class UpdateGheDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  localDescription?: string;

  @IsOptional()
  @IsString()
  activityDescription?: string;
}

/** Vínculo Setor+Cargo de um GHE (seção 14 do escopo) — ver GheFunction no schema. */
export class CreateGheFunctionDto {
  @IsString()
  gheId!: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  positionId?: string;

  @IsOptional()
  @IsString()
  activityDescription?: string;
}

export class UpdateGheFunctionDto {
  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  positionId?: string;

  @IsOptional()
  @IsString()
  activityDescription?: string;
}

/** Campos de um risco (seções 16-20 do escopo) — Identificação / Avaliação /
 * Prevenção e controle, espelhando exatamente o PGR de referência. */
class PgrRiskFields {
  @IsOptional()
  @IsString()
  typicalInjuries?: string;

  @IsOptional()
  @IsString()
  sourceCircumstances?: string;

  @IsOptional()
  @IsString()
  propagationMeans?: string;

  @IsOptional()
  @IsIn(EXPOSURE_TYPES)
  exposureType?: ExposureType;

  @IsOptional()
  @IsIn(EVALUATION_CRITERIA)
  evaluationCriteria?: EvaluationCriteria;

  @IsOptional()
  @IsString()
  exposureProfile?: string;

  @IsOptional()
  @IsString()
  classification?: string;

  @IsOptional()
  @IsString()
  conclusion?: string;

  @IsOptional()
  @IsString()
  adminControls?: string;

  @IsOptional()
  @IsString()
  engineeringControls?: string;

  @IsOptional()
  @IsString()
  epcMeasures?: string;

  @IsOptional()
  @IsString()
  epiMeasures?: string;
}

export class CreatePgrRiskDto extends PgrRiskFields {
  @IsString()
  pgrId!: string;

  @IsString()
  gheId!: string;

  @IsString()
  hazardId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  probability!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  severity!: number;
}

export class UpdatePgrRiskDto extends PgrRiskFields {
  @IsOptional()
  @IsString()
  gheId?: string;

  @IsOptional()
  @IsString()
  hazardId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  probability?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  severity?: number;
}

const ACTION_STATUSES: ActionStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "LATE",
  "VALIDATING",
  "DONE",
  "CANCELED",
];

export class CreatePgrActionDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  pgrId?: string;

  @IsOptional()
  @IsString()
  pgrRiskId?: string;

  @IsString()
  @MinLength(3)
  description!: string;

  @IsOptional()
  @IsString()
  responsibleId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  priority?: number;
}

export class UpdatePgrActionStatusDto {
  @IsIn(ACTION_STATUSES)
  status!: ActionStatus;
}
