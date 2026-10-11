import { Type } from "class-transformer";
import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from "class-validator";

export class ImportRiskRowDto {
  @IsInt()
  rowNumber!: number;

  @IsOptional() @IsString() sheetName?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() branchName?: string;
  @IsOptional() @IsString() gheName?: string;
  @IsOptional() @IsString() departmentName?: string;
  @IsOptional() @IsString() positionName?: string;
  @IsOptional() @IsString() hazardName?: string;
  @IsOptional() @IsString() hazardAgent?: string;
  @IsOptional() @IsString() typicalInjuries?: string;
  @IsOptional() @IsString() sourceCircumstances?: string;
  @IsOptional() @IsString() propagationMeans?: string;
  @IsOptional() @IsString() exposureType?: string;
  @IsOptional() @IsString() evaluationCriteria?: string;
  @IsOptional() @IsString() exposureProfile?: string;
  @IsOptional() probability?: number;
  @IsOptional() severity?: number;
  @IsOptional() @IsString() classification?: string;
  @IsOptional() @IsString() conclusion?: string;
  @IsOptional() @IsString() adminControls?: string;
  @IsOptional() @IsString() engineeringControls?: string;
  @IsOptional() @IsString() epcMeasures?: string;
  @IsOptional() @IsString() epiMeasures?: string;
}

export class ConfirmRiskImportDto {
  @IsOptional()
  @IsString()
  fileName?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportRiskRowDto)
  rows!: ImportRiskRowDto[];
}
