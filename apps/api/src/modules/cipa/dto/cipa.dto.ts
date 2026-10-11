import { IsDateString, IsIn, IsString } from "class-validator";
import type { CipaMemberRole, CipaRepresentation } from "@hydra/db";

const MEMBER_ROLES: CipaMemberRole[] = ["TITULAR", "SUPLENTE"];
const REPRESENTATIONS: CipaRepresentation[] = ["EMPREGADOR", "EMPREGADOS"];

export class CreateCipaTermDto {
  @IsString()
  companyId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}

export class CreateCipaMemberDto {
  @IsString()
  termId!: string;

  @IsString()
  employeeId!: string;

  @IsIn(MEMBER_ROLES)
  role!: CipaMemberRole;

  @IsIn(REPRESENTATIONS)
  representation!: CipaRepresentation;
}
