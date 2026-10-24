import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, ValidateNested, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class CreateCompanyDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  // Identificação
  @IsOptional()
  @IsBoolean()
  unidadeContratante?: boolean;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsString()
  cei?: string;

  @IsOptional()
  @IsString()
  caepf?: string;

  @IsOptional()
  @IsString()
  cno?: string;

  @IsOptional()
  @IsString()
  inscricaoEstadual?: string;

  @IsOptional()
  @IsString()
  inscricaoMunicipal?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  codigoRH?: string;

  // CNAE e risco
  @IsOptional()
  @IsString()
  cnae?: string;

  @IsOptional()
  @IsString()
  cnaeSecundario?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  grauRisco?: number;

  @IsOptional()
  @IsString()
  caracterizacaoProcessos?: string;

  @IsOptional()
  @IsString()
  descricaoLocal?: string;

  @IsOptional()
  @IsBoolean()
  desconsiderarEsocial?: boolean;

  // Endereço
  @IsOptional()
  @IsString()
  cep?: string;

  @IsOptional()
  @IsString()
  endereco?: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  complemento?: string;

  @IsOptional()
  @IsString()
  bairro?: string;

  @IsOptional()
  @IsString()
  cidade?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  // Endereço de cobrança
  @IsOptional()
  @IsString()
  cepCobranca?: string;

  @IsOptional()
  @IsString()
  enderecoCobranca?: string;

  @IsOptional()
  @IsString()
  numeroCobranca?: string;

  @IsOptional()
  @IsString()
  complementoCobranca?: string;

  @IsOptional()
  @IsString()
  bairroCobranca?: string;

  @IsOptional()
  @IsString()
  cidadeCobranca?: string;

  @IsOptional()
  @IsString()
  estadoCobranca?: string;

  // Contrato / PPP / ASO / Brigada
  @IsOptional()
  @IsDateString()
  dataContrato?: string;

  @IsOptional()
  @IsString()
  observacaoPPP?: string;

  @IsOptional()
  @IsString()
  observacaoASO?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentualBrigada?: number;

  /** Vidas contratadas (base do faturamento). */
  @IsOptional()
  @IsInt()
  @Min(0)
  contractedLives?: number;
}

export class CreateBranchDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  cep?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  complemento?: string;

  @IsOptional()
  @IsString()
  bairro?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsIn(["ACTIVE", "INACTIVE"])
  status?: "ACTIVE" | "INACTIVE";
}

export class CreateUnitDto {
  @IsString()
  branchId!: string;

  @IsString()
  @MinLength(2)
  name!: string;
}

export class CreateDepartmentDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsIn(["ACTIVE", "INACTIVE"])
  status?: "ACTIVE" | "INACTIVE";
}

export class CreatePositionDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  cbo?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(["ACTIVE", "INACTIVE"])
  status?: "ACTIVE" | "INACTIVE";

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsDateString()
  esocialStartDate?: string;

  @IsOptional()
  @IsBoolean()
  requiresEntryAptitude?: boolean;

  @IsOptional()
  @IsString()
  sectorInfo?: string;

  @IsOptional()
  @IsString()
  workSchedule?: string;

  @IsOptional()
  @IsString()
  additionalInfo?: string;

  @IsOptional()
  @IsString()
  technicalOpinion?: string;

  @IsOptional()
  @IsString()
  safetyRecommendations?: string;

  @IsOptional()
  @IsString()
  gfipCode?: string;

  @IsOptional()
  @IsString()
  ergonomicMethodology?: string;

  @IsOptional()
  @IsString()
  generalNotes?: string;

  @IsOptional()
  @IsString()
  ltcatOpinionNotes?: string;

  @IsOptional()
  @IsString()
  ltcatOpinionConclusion?: string;

  @IsOptional()
  @IsString()
  hazardPayOpinionNotes?: string;

  @IsOptional()
  @IsString()
  hazardPayOpinionConclusion?: string;

  @IsOptional()
  @IsString()
  unhealthinessOpinionNotes?: string;

  @IsOptional()
  @IsString()
  unhealthinessOpinionConclusion?: string;

  @IsOptional()
  @IsBoolean()
  complementaryInfoEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  technicalOpinionEnabled?: boolean;

  /** Ambientes pelos quais o cargo transita. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  environmentIds?: string[];
}

export class CreateWorkEnvironmentDto {
  @IsString()
  companyId!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsIn(["MATRIZ", "FILIAL"])
  unitType?: "MATRIZ" | "FILIAL";
}

export class UpdateWorkEnvironmentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsIn(["MATRIZ", "FILIAL"])
  unitType?: "MATRIZ" | "FILIAL";
}

export class CreateEmployeeDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsString()
  departmentId!: string;

  @IsString()
  positionId!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  // Dados cadastrais
  @IsOptional()
  @IsString()
  leaveReason?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsString()
  registration?: string;

  @IsOptional()
  @IsDateString()
  admittedAt?: string;

  @IsOptional()
  @IsDateString()
  inactivatedAt?: string;

  @IsOptional()
  @IsString()
  sex?: string;

  @IsOptional()
  @IsString()
  rg?: string;

  @IsOptional()
  @IsDateString()
  rgIssueDate?: string;

  @IsOptional()
  @IsString()
  rgIssuer?: string;

  @IsOptional()
  @IsDateString()
  rgExpiryDate?: string;

  @IsOptional()
  @IsString()
  nit?: string;

  @IsOptional()
  @IsString()
  ctps?: string;

  @IsOptional()
  @IsString()
  ctpsSeries?: string;

  @IsOptional()
  @IsDateString()
  ctpsIssueDate?: string;

  @IsOptional()
  @IsString()
  ctpsState?: string;

  // Endereço
  @IsOptional()
  @IsString()
  cep?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  addressNumber?: string;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  homePhone?: string;

  @IsOptional()
  @IsString()
  mobilePhone?: string;

  @IsOptional()
  @IsBoolean()
  smsOptIn?: boolean;

  // Deficiência
  @IsOptional()
  @IsBoolean()
  rehabilitated?: boolean;

  @IsOptional()
  @IsBoolean()
  disabled?: boolean;

  @IsOptional()
  @IsString()
  disabilityType?: string;
}

export class ImportPositionItemDto {
  @IsString()
  sourcePositionId!: string;

  @IsString()
  @MinLength(2)
  newName!: string;

  /** Ambientes do cargo de origem que NÃO devem ser levados para a cópia. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeEnvironmentIds?: string[];

  @IsOptional()
  @IsBoolean()
  copyEnvironments?: boolean;

  @IsOptional()
  @IsBoolean()
  copyRisks?: boolean;

  /** Riscos (do catálogo) que não devem ir para a cópia. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeHazardIds?: string[];

  @IsOptional()
  @IsBoolean()
  copyExams?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeExamIds?: string[];
}

const TRI_STATE = ["SIM", "NAO", "NAO_SE_APLICA"];

/** Dados do risco naquele cargo: cópia do cadastro (editável por empresa) + avaliação. */
export class PositionRiskFieldsDto {
  @IsOptional() @IsIn(["HABITUAL", "EVENTUAL", "INTERMITENTE", "PERMANENTE"]) exposureType?: "HABITUAL" | "EVENTUAL" | "INTERMITENTE" | "PERMANENTE" | null;
  @IsOptional() @IsBoolean() sendEsocial?: boolean;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() damagePotential?: string;
  @IsOptional() @IsString() observations?: string;
  @IsOptional() @IsString() sourceCircumstances?: string;
  @IsOptional() @IsString() adminMeasures?: string;
  @IsOptional() @IsIn(["QUALITATIVO", "QUANTITATIVO"]) measurementType?: "QUALITATIVO" | "QUANTITATIVO";
  @IsOptional() @IsBoolean() generatesUnhealthiness?: boolean;
  @IsOptional() @IsBoolean() generatesHazardPay?: boolean;
  @IsOptional() @IsBoolean() specialRetirement?: boolean;
  @IsOptional() @IsBoolean() insertInAso?: boolean;
  @IsOptional() @IsIn(TRI_STATE) epcStatus?: string;
  @IsOptional() @IsIn(TRI_STATE) epiStatus?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) probability?: number | null;
  @IsOptional() @IsInt() @Min(1) @Max(5) severity?: number | null;
  @IsOptional() @IsInt() @Min(1) @Max(3) certainty?: number | null;
  @IsOptional() @IsArray() @IsString({ each: true }) equipmentIds?: string[];
}

export class LinkPositionRisksDto extends PositionRiskFieldsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  positionIds!: string[];

  @IsString()
  hazardId!: string;
}

export class UpdatePositionRiskDto extends PositionRiskFieldsDto {}

export class AddPositionExamsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MinLength(2, { each: true })
  names!: string[];
}

export class ImportFromPositionDto {
  @IsString()
  sourcePositionId!: string;
}

export class ImportPositionsDto {
  @IsString()
  targetCompanyId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportPositionItemDto)
  items!: ImportPositionItemDto[];
}
