import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import type { PsychosocialSurveyStatus } from "@hydra/db";

const SURVEY_STATUSES: PsychosocialSurveyStatus[] = ["DRAFT", "ACTIVE", "CLOSED"];

export class CreatePsychosocialSurveyDto {
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
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  /** Se true (padrão), a campanha já nasce com um conjunto fictício de perguntas
   * de exemplo (7 dimensões), para o usuário visualizar o formato antes de
   * substituir pelo questionário oficial. */
  @IsOptional()
  useSampleQuestions?: boolean;
}

export class UpdatePsychosocialSurveyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn(SURVEY_STATUSES)
  status?: PsychosocialSurveyStatus;
}

export class CreatePsychosocialQuestionDto {
  @IsString()
  surveyId!: string;

  @IsString()
  @MinLength(2)
  dimension!: string;

  @IsString()
  @MinLength(2)
  text!: string;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class UpdatePsychosocialQuestionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  dimension?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  text?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class SendInvitesDto {
  /** Se omitido, convida todos os colaboradores ativos da empresa/filial da campanha. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  employeeIds?: string[];
}

export class SubmitAnswerDto {
  @IsString()
  questionId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  value!: number;
}

export class SubmitResponseDto {
  /** CPF em texto puro, só de passagem — o servidor mascara antes de gravar
   * (nunca persiste o CPF completo). Autodeclarado, não vinculado ao convite/colaborador. */
  @IsOptional()
  @IsString()
  cpf?: string;

  /** Unidade/Setor/Cargo/GHE autodeclarados pelo respondente — opcionais, não
   * vinculados ao convite/colaborador, preservando o anonimato da resposta. */
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  positionId?: string;

  @IsOptional()
  @IsString()
  gheId?: string;

  /** Aceite do termo de consentimento LGPD — obrigatório para enviar a avaliação. */
  @IsBoolean()
  consent!: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers!: SubmitAnswerDto[];
}
