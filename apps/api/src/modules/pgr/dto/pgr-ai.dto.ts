import { IsIn, IsOptional, IsString, MinLength } from "class-validator";
import type { ExposureType, RiskCategory } from "@hydra/db";

const RISK_CATEGORIES: RiskCategory[] = ["FISICO", "QUIMICO", "BIOLOGICO", "ERGONOMICO", "ACIDENTE"];
const EXPOSURE_TYPES: ExposureType[] = ["EVENTUAL", "INTERMITENTE", "PERMANENTE"];

export class SuggestHazardsDto {
  @IsString()
  @MinLength(5)
  activityDescription!: string;

  @IsOptional()
  @IsString()
  localDescription?: string;

  @IsOptional()
  @IsIn(RISK_CATEGORIES)
  category?: RiskCategory;
}

export class SuggestConsequencesDto {
  @IsString()
  @MinLength(2)
  hazardName!: string;

  @IsIn(RISK_CATEGORIES)
  category!: RiskCategory;

  @IsOptional()
  @IsString()
  activityDescription?: string;
}

export class SuggestSourcesDto extends SuggestConsequencesDto {}

export class SuggestControlsDto {
  @IsString()
  @MinLength(2)
  hazardName!: string;

  @IsIn(RISK_CATEGORIES)
  category!: RiskCategory;

  @IsOptional()
  @IsString()
  activityDescription?: string;

  @IsOptional()
  @IsIn(EXPOSURE_TYPES)
  exposureType?: ExposureType;

  @IsOptional()
  @IsString()
  riskLevel?: string;
}

export class ImproveActivityDescriptionDto {
  @IsString()
  @MinLength(5)
  text!: string;
}

export class EvaluateRiskDto {
  @IsString()
  @MinLength(2)
  hazardName!: string;

  @IsIn(RISK_CATEGORIES)
  category!: RiskCategory;

  @IsOptional()
  @IsString()
  activityDescription?: string;

  @IsOptional()
  @IsIn(EXPOSURE_TYPES)
  exposureType?: ExposureType;
}
