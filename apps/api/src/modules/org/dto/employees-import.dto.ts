import { Type } from "class-transformer";
import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from "class-validator";

export class ImportEmployeeRowDto {
  @IsInt()
  rowNumber!: number;

  @IsOptional() @IsString() matricula?: string;
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() branchName?: string;
  @IsOptional() @IsString() sex?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() departmentName?: string;
  @IsOptional() @IsString() positionName?: string;
  @IsOptional() @IsString() birthDate?: string;
  @IsOptional() @IsString() cpf?: string;
  @IsOptional() @IsString() admittedAt?: string;
  @IsOptional() @IsString() inactivatedAt?: string;
  @IsOptional() @IsString() situacao?: string;
}

export class ConfirmImportDto {
  @IsOptional()
  @IsString()
  fileName?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportEmployeeRowDto)
  rows!: ImportEmployeeRowDto[];
}
