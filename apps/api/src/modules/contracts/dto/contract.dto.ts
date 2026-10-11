import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
import type { ContractStatus } from "@hydra/db";

const CONTRACT_STATUSES: ContractStatus[] = ["ATIVO", "CANCELADO"];

export class CreateContractDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsString()
  templateId!: string;

  // CONTRATANTE
  @IsString()
  @MinLength(2)
  razaoSocial!: string;

  @IsOptional()
  @IsString()
  nomeFantasia?: string;

  @IsString()
  @MinLength(11)
  cnpj!: string;

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

  // Representante legal
  @IsString()
  @MinLength(2)
  repNome!: string;

  @IsOptional()
  @IsString()
  repNacionalidade?: string;

  @IsOptional()
  @IsString()
  repEstadoCivil?: string;

  @IsOptional()
  @IsString()
  repProfissao?: string;

  @IsOptional()
  @IsString()
  repRg?: string;

  @IsOptional()
  @IsString()
  repCpf?: string;

  // Termos
  @IsOptional()
  @IsInt()
  @Min(0)
  quantidadeVidas?: number;

  @IsDateString()
  dataInicio!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  prazoMeses?: number;

  @IsNumber()
  @Min(0)
  valorMensalidade!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorPrimeiraParcela?: number;

  @IsOptional()
  @IsDateString()
  dataVencimentoPrimeiraParcela?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  diaVencimentoMensal?: number;

  @IsOptional()
  @IsString()
  formaPagamento?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  qtdVisitas?: number;

  @IsOptional()
  @IsString()
  frequenciaVisitas?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  serviceItemIds?: string[];
}

export class UpdateContractDto extends CreateContractDto {
  @IsOptional()
  @IsIn(CONTRACT_STATUSES)
  status?: ContractStatus;
}

export class UpsertContractIssuerDto {
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

  @IsOptional()
  @IsString()
  repNome?: string;

  @IsOptional()
  @IsString()
  repNacionalidade?: string;

  @IsOptional()
  @IsString()
  repEstadoCivil?: string;

  @IsOptional()
  @IsString()
  repProfissao?: string;

  @IsOptional()
  @IsString()
  repRg?: string;

  @IsOptional()
  @IsString()
  repCpf?: string;
}
