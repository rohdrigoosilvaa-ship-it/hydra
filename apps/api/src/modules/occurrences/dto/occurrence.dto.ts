import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";
import type { CatType, InvestigationMethod, OccurrenceInvolvedPersonRole, OccurrenceStatus, OccurrenceType } from "@hydra/db";

const OCCURRENCE_TYPES: OccurrenceType[] = [
  "INCIDENT",
  "NEAR_MISS",
  "ACCIDENT_TYPICAL",
  "ACCIDENT_COMMUTE",
  "OCCUPATIONAL_DISEASE",
];
const INVESTIGATION_METHODS: InvestigationMethod[] = ["FIVE_WHYS", "ISHIKAWA"];
const CAT_TYPES: CatType[] = ["TYPICAL", "COMMUTE", "DISEASE"];
const OCCURRENCE_STATUSES: OccurrenceStatus[] = ["OPEN", "INVESTIGATING", "CLOSED"];
const INVOLVED_PERSON_ROLES: OccurrenceInvolvedPersonRole[] = ["VITIMA", "TESTEMUNHA", "ENVOLVIDO"];

export class CreateOccurrenceDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsIn(OCCURRENCE_TYPES)
  type!: OccurrenceType;

  @IsOptional()
  @IsBoolean()
  highPotential?: boolean;

  @IsString()
  @MinLength(3)
  description!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  immediateActions?: string;

  @IsDateString()
  occurredAt!: string;
}

export class UpdateOccurrenceDto {
  @IsOptional()
  @IsString()
  immediateActions?: string;

  @IsOptional()
  @IsIn(OCCURRENCE_STATUSES)
  status?: OccurrenceStatus;
}

export class CreateInvolvedPersonDto {
  @IsString()
  occurrenceId!: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsIn(INVOLVED_PERSON_ROLES)
  role!: OccurrenceInvolvedPersonRole;
}

export class CreateInvestigationDto {
  @IsString()
  occurrenceId!: string;

  @IsIn(INVESTIGATION_METHODS)
  method!: InvestigationMethod;

  @IsOptional()
  @IsString()
  immediateCause?: string;

  @IsOptional()
  @IsString()
  rootCause?: string;

  @IsOptional()
  @IsString()
  findings?: string;
}

export class CreateCatDto {
  @IsString()
  occurrenceId!: string;

  @IsIn(CAT_TYPES)
  type!: CatType;

  @IsOptional()
  @IsInt()
  @Min(0)
  leaveDays?: number;
}
