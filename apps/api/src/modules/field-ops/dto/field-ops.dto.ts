import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import type {
  BehaviorObservationCategory,
  EvidenceSourceType,
  ChecklistFrequency,
  ChecklistTemplateStatus,
  InspectionItemType,
  InspectionResponseValue,
  NonConformityCreation,
  InspectionStatus,
  NonConformitySeverity,
  NonConformityStatus,
} from "@hydra/db";

const ITEM_TYPES: InspectionItemType[] = [
  "CONFORME_NAO_CONFORME",
  "SIM_NAO",
  "NOTA",
  "TEXTO_LIVRE",
  "SELECAO_MULTIPLA",
  "TEXTO_CURTO",
  "TEXTO_LONGO",
  "SELECAO_UNICA",
  "NUMERO",
  "DATA",
  "HORA",
  "ESCALA",
];
const FREQUENCIES: ChecklistFrequency[] = ["DIARIA", "SEMANAL", "MENSAL", "POR_TURNO", "POR_EVENTO", "PERSONALIZADA"];
const TEMPLATE_STATUSES: ChecklistTemplateStatus[] = ["RASCUNHO", "ATIVO", "INATIVO", "ARQUIVADO"];
const NC_CREATION: NonConformityCreation[] = ["MANUAL", "AUTOMATICA"];
const RESPONSE_VALUES: InspectionResponseValue[] = ["CONFORME", "NAO_CONFORME", "NAO_APLICAVEL"];
const INSPECTION_STATUSES: InspectionStatus[] = ["EM_ANDAMENTO", "CONCLUIDA", "CANCELADA"];
const NC_SEVERITIES: NonConformitySeverity[] = ["BAIXA", "MEDIA", "ALTA", "CRITICA"];
const NC_STATUSES: NonConformityStatus[] = ["ABERTA", "EM_TRATATIVA", "RESOLVIDA"];
const BEHAVIOR_CATEGORIES: BehaviorObservationCategory[] = [
  "ATO_SEGURO",
  "ATO_INSEGURO",
  "CONDICAO_SEGURA",
  "CONDICAO_INSEGURA",
];
const EVIDENCE_SOURCE_TYPES: EvidenceSourceType[] = [
  "INSPECTION",
  "INSPECTION_ITEM_RESPONSE",
  "NON_CONFORMITY",
  "BEHAVIOR_OBSERVATION",
  "OCCURRENCE",
  "ACTION",
  "AUDIT",
  "PGR",
];

export class CreateInspectionTemplateItemDto {
  @IsInt()
  order!: number;

  @IsString()
  @MinLength(2)
  text!: string;

  @IsOptional()
  @IsIn(ITEM_TYPES)
  responseType?: InspectionItemType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsString()
  blockLabel?: string;

  @IsOptional()
  @IsBoolean()
  allowPhoto?: boolean;
}

export class StructureSectionDto {
  /** Chave local (estável durante a edição) usada para ligar as perguntas à seção. */
  @IsString()
  key!: string;

  /** Presente = seção que já existe no modelo. */
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1)
  name!: string;
}

export class StructureItemDto {
  @IsString()
  key!: string;

  /** Presente = pergunta que já existe no modelo. */
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  sectionKey?: string;

  @IsString()
  @MinLength(2)
  text!: string;

  @IsOptional()
  @IsString()
  instruction?: string;

  @IsIn(ITEM_TYPES)
  responseType!: InspectionItemType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsBoolean()
  allowComment?: boolean;

  @IsOptional()
  @IsBoolean()
  allowPhoto?: boolean;

  @IsOptional()
  @IsBoolean()
  allowActionPlan?: boolean;

  @IsOptional()
  @IsInt()
  scaleMin?: number;

  @IsOptional()
  @IsInt()
  scaleMax?: number;

  /** Chave da pergunta que condiciona esta (ela precisa vir antes). */
  @IsOptional()
  @IsString()
  conditionKey?: string;

  @IsOptional()
  @IsIn(["IGUAL", "DIFERENTE"])
  conditionOperator?: "IGUAL" | "DIFERENTE";

  @IsOptional()
  @IsString()
  conditionValue?: string;

  @IsOptional()
  @IsString()
  blockLabel?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

/** Estrutura completa do modelo: seções e perguntas na ordem em que devem aparecer. */
export class ReplaceChecklistStructureDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StructureSectionDto)
  sections!: StructureSectionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StructureItemDto)
  items!: StructureItemDto[];
}

export class ChangeTemplateStatusDto {
  @IsIn(TEMPLATE_STATUSES)
  status!: ChecklistTemplateStatus;
}

export class CreateInspectionBlockItemDto {
  @IsInt()
  order!: number;

  @IsString()
  @MinLength(2)
  text!: string;

  @IsOptional()
  @IsIn(ITEM_TYPES)
  responseType?: InspectionItemType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsBoolean()
  allowPhoto?: boolean;
}

export class CreateInspectionBlockDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInspectionBlockItemDto)
  items!: CreateInspectionBlockItemDto[];
}

export class UpdateInspectionBlockDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInspectionBlockItemDto)
  items?: CreateInspectionBlockItemDto[];
}

/** Dados cadastrais do modelo (usados na criação e na edição). */
class TemplateDataFields {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(FREQUENCIES)
  frequency?: ChecklistFrequency;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  process?: string;

  @IsOptional()
  @IsString()
  responsibleId?: string;

  @IsOptional()
  @IsIn(NC_CREATION)
  ncCreation?: NonConformityCreation;
}

export class CreateInspectionTemplateDto extends TemplateDataFields {
  @IsOptional()
  @IsString()
  companyId?: string;
}

export class UpdateInspectionTemplateItemDto {
  @IsString()
  @MinLength(1)
  text!: string;

  @IsOptional()
  @IsString()
  blockLabel?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  allowPhoto?: boolean;
}

export class UpdateInspectionTemplateDto extends TemplateDataFields {}

export class CreateInspectionDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsString()
  templateId!: string;

  @IsOptional()
  @IsString()
  inspectorId?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class UpdateInspectionDto {
  @IsOptional()
  @IsIn(INSPECTION_STATUSES)
  status?: InspectionStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpsertInspectionResponseDto {
  @IsString()
  templateItemId!: string;

  @IsOptional()
  @IsIn(RESPONSE_VALUES)
  value?: InspectionResponseValue;

  @IsOptional()
  @IsString()
  textValue?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class CreateNonConformityDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  inspectionId?: string;

  @IsOptional()
  @IsString()
  inspectionItemResponseId?: string;

  @IsString()
  @MinLength(2)
  description!: string;

  @IsOptional()
  @IsIn(NC_SEVERITIES)
  severity?: NonConformitySeverity;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdateNonConformityStatusDto {
  @IsIn(NC_STATUSES)
  status!: NonConformityStatus;
}

export class CreateEvidenceDto {
  @IsIn(EVIDENCE_SOURCE_TYPES)
  sourceType!: EvidenceSourceType;

  @IsString()
  sourceId!: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

export class CreateBehaviorObservationDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  observerId?: string;

  @IsOptional()
  @IsString()
  observedEmployeeId?: string;

  @IsIn(BEHAVIOR_CATEGORIES)
  category!: BehaviorObservationCategory;

  @IsString()
  @MinLength(2)
  description!: string;

  @IsOptional()
  @IsString()
  actionTaken?: string;
}
