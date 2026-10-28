import { IsDateString, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import type { ExamResult, ExamType } from "@hydra/db";

const EXAM_TYPES: ExamType[] = [
  "ADMISSIONAL",
  "PERIODICO",
  "DEMISSIONAL",
  "RETORNO_TRABALHO",
  "MUDANCA_RISCO",
];
const EXAM_RESULTS: ExamResult[] = ["APTO", "INAPTO", "PENDENTE"];

export class CreatePcmsoDto {
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
  responsibleId?: string;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

export class CreateMedicalExamDto {
  @IsString()
  employeeId!: string;

  @IsOptional()
  @IsString()
  pcmsoId?: string;

  @IsIn(EXAM_TYPES)
  type!: ExamType;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsDateString()
  performedAt?: string;

  @IsOptional()
  @IsDateString()
  nextDueAt?: string;

  @IsOptional()
  @IsIn(EXAM_RESULTS)
  result?: ExamResult;
}

/** Edição do exame lançado: tudo opcional; data vazia (null) limpa o campo. */
export class UpdateMedicalExamDto {
  @IsOptional()
  @IsIn(EXAM_TYPES)
  type?: ExamType;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string | null;

  @IsOptional()
  @IsDateString()
  performedAt?: string | null;

  @IsOptional()
  @IsDateString()
  nextDueAt?: string | null;

  @IsOptional()
  @IsIn(EXAM_RESULTS)
  result?: ExamResult;
}

export class CreateAsoDto {
  @IsString()
  examId!: string;

  @IsIn(EXAM_RESULTS)
  result!: ExamResult;

  @IsOptional()
  @IsString()
  physicianId?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}
