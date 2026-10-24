import { IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

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
