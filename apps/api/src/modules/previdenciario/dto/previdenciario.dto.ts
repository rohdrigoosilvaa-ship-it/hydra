import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString } from "class-validator";
import type { AbsenceType } from "@hydra/db";

const ABSENCE_TYPES: AbsenceType[] = ["DOENCA", "MATERNIDADE", "ACIDENTE", "OUTROS"];

export class CreateAbsenceDto {
  @IsString()
  employeeId!: string;

  @IsIn(ABSENCE_TYPES)
  type!: AbsenceType;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  cid?: string;

  @IsOptional()
  @IsString()
  inssBenefit?: string;
}

export class CreateFapRecordDto {
  @IsString()
  companyId!: string;

  @IsInt()
  year!: number;

  @IsNumber()
  fapIndex!: number;

  @IsOptional()
  @IsInt()
  ntepCount?: number;
}

export class CreatePppDto {
  @IsString()
  employeeId!: string;

  @IsString()
  companyId!: string;

  @IsDateString()
  periodStart!: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @IsOptional()
  @IsString()
  responsibleId?: string;
}
