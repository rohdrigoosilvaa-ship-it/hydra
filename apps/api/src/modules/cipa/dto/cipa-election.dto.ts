import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import type { CipaElectionType } from "@hydra/db";

const ELECTION_TYPES: CipaElectionType[] = ["PRIMEIRA", "RENOVACAO"];

export class CreateCipaElectionDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsIn(ELECTION_TYPES)
  type!: CipaElectionType;

  @IsInt()
  @Min(1)
  @Max(4)
  grauRisco!: number;

  @IsString()
  @MinLength(2)
  gestaoLabel!: string;

  @IsOptional()
  @IsDateString()
  posseDate?: string;

  @IsOptional()
  @IsDateString()
  dataTerminoMandatoAtual?: string;
}

export class UpdateCipaElectionDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsIn(ELECTION_TYPES)
  type?: CipaElectionType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  grauRisco?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  gestaoLabel?: string;

  @IsOptional()
  @IsDateString()
  posseDate?: string;

  @IsOptional()
  @IsDateString()
  dataTerminoMandatoAtual?: string;
}

export class ToggleCipaScheduleStepDto {
  @IsBoolean()
  concluido!: boolean;
}
