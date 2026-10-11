import { IsDateString, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import type { ProviderType } from "@hydra/db";

const PROVIDER_TYPES: ProviderType[] = [
  "CLINICA",
  "ENGENHEIRO",
  "TECNICO",
  "CONSULTORIA",
  "LABORATORIO",
  "OUTRO",
];

export class CreateProviderDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsIn(PROVIDER_TYPES)
  type!: ProviderType;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class RequestProviderContractDto {
  @IsString()
  providerId!: string;

  @IsString()
  companyId!: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
