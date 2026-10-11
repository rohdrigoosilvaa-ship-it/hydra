import { IsDateString, IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import type { CrmStage } from "@hydra/db";

const STAGES: CrmStage[] = ["LEAD", "CONTATO", "QUALIFICACAO", "PROPOSTA", "NEGOCIACAO", "CONTRATO", "CLIENTE"];

export class CreateCrmLeadDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateCrmLeadStageDto {
  @IsIn(STAGES)
  stage!: CrmStage;
}

export class CreateCrmTaskDto {
  @IsString()
  leadId!: string;

  @IsString()
  @MinLength(3)
  description!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
