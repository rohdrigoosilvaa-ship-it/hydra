import { IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import type { ActionStatus, EvaluationCriteria, ExposureType, RiskCategory } from "@hydra/db";

const RISK_CATEGORIES: RiskCategory[] = ["FISICO", "QUIMICO", "BIOLOGICO", "ERGONOMICO", "ACIDENTE"];
const EXPOSURE_TYPES: ExposureType[] = ["HABITUAL", "EVENTUAL", "INTERMITENTE", "PERMANENTE"];
const EVALUATION_CRITERIA: EvaluationCriteria[] = ["QUALITATIVO", "QUANTITATIVO"];

const TRI_STATE = ["SIM", "NAO", "NAO_SE_APLICA"];

/** Campos do cadastro de risco (catálogo) além de categoria/nome/código. */
class HazardExtraFields {
  @IsOptional() @IsString() sourceCircumstances?: string;
  @IsOptional() @IsString() observations?: string;
  @IsOptional() @IsString() adminMeasures?: string;
  @IsOptional() @IsIn(EXPOSURE_TYPES) exposureType?: ExposureType | null;
  @IsOptional() @IsBoolean() sendEsocial?: boolean;
  @IsOptional() @IsIn(EVALUATION_CRITERIA) measurementType?: EvaluationCriteria;
  @IsOptional() @IsBoolean() generatesUnhealthiness?: boolean;
  @IsOptional() @IsBoolean() generatesHazardPay?: boolean;
  @IsOptional() @IsBoolean() specialRetirement?: boolean;
  @IsOptional() @IsBoolean() insertInAso?: boolean;
  @IsOptional() @IsIn(TRI_STATE) epcStatus?: string;
  @IsOptional() @IsIn(TRI_STATE) epiStatus?: string;
  /** EPCs/EPIs do banco indicados para este risco (substitui a lista). */
  @IsOptional() @IsArray() @IsString({ each: true }) equipmentIds?: string[];
}

export class CreateProtectionCategoryDto {
  @IsIn(["EPC", "EPI"]) kind!: "EPC" | "EPI";
  @IsString() @MinLength(2) name!: string;
}

export class CreateProtectionEquipmentDto {
  @IsIn(["EPC", "EPI"]) kind!: "EPC" | "EPI";
  @IsOptional() @IsString() categoryId?: string;
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsInt() @Min(1) @Max(1200) usefulLifeMonths?: number;
  @IsString() @MinLength(2) description!: string;
}

export class CreateHazardDto extends HazardExtraFields {
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

export class UpdateHazardDto extends HazardExtraFields {
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

  /** Texto do documento editável (HTML do editor do modelo). */
  @IsOptional()
  @IsString()
  modelHtml?: string;

  @IsOptional()
  @IsString()
  coordinator?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  renewalAt?: string;

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

  /** Cria o GHE a partir de um Setor cadastrado (vira o vínculo Setor/Cargo do GHE). */
  @IsOptional()
  @IsString()
  departmentId?: string;

  /** Cargos (funções) do setor a vincular ao GHE; vazio = só o setor. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  positionIds?: string[];
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
const YES_NO: string[] = ["SIM", "NAO", "NAO_SE_APLICA"];

class PgrRiskFields {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  legalBasis?: string;

  @IsOptional()
  @IsString()
  exposureTime?: string;

  @IsOptional()
  @IsIn(YES_NO)
  usesEpc?: string;

  @IsOptional()
  @IsIn(YES_NO)
  epcEffective?: string;

  @IsOptional()
  @IsIn(YES_NO)
  usesEpi?: string;

  @IsOptional()
  @IsIn(YES_NO)
  epiEffective?: string;

  @IsOptional()
  @IsString()
  requiredActions?: string;

  @IsOptional()
  @IsString()
  guidance?: string;

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
  @Max(4)
  probability!: number;

  @IsInt()
  @Min(1)
  @Max(4)
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

export class GeneratePgrDto extends PgrDocumentFields {
  @IsString()
  companyId!: string;

  @IsString()
  @MinLength(2)
  title!: string;

  /** Ambientes da empresa que viram GHEs do PGR. */
  @IsArray()
  @IsString({ each: true })
  environmentIds!: string[];

  /** Cronogramas de ação da empresa anexados (viram as ações do plano de ação). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scheduleIds?: string[];
}
