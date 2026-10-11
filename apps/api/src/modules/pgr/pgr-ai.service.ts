import { Injectable, InternalServerErrorException, Logger, NotFoundException } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { companyScopeWhere } from "../org/scope.util";
import type {
  EvaluateRiskDto,
  ImproveActivityDescriptionDto,
  SuggestConsequencesDto,
  SuggestControlsDto,
  SuggestHazardsDto,
  SuggestSourcesDto,
} from "./dto/pgr-ai.dto";

/** Rótulo obrigatório em toda sugestão gerada por IA — nunca deve ser tratada como fato confirmado. */
export const AI_DISCLAIMER = "Sugestão da IA — validar tecnicamente";

const SYSTEM_PROMPT = `Você é um assistente técnico de apoio à elaboração de PGR (Programa de Gerenciamento de Riscos) conforme a NR-01 brasileira.

Regras obrigatórias:
- Responda sempre em português do Brasil, com linguagem técnica de Segurança e Saúde no Trabalho.
- Você NUNCA tem acesso a dados reais desta empresa (razão social, CNPJ, endereço, número de funcionários, medições reais de exposição). Baseie-se exclusivamente nas informações fornecidas na pergunta e no seu conhecimento geral de metodologia de gestão de riscos ocupacionais. Nunca invente esses dados.
- Toda a sua resposta é uma SUGESTÃO que precisa ser validada por um profissional técnico habilitado (Engenheiro ou Técnico de Segurança do Trabalho) antes de ser usada no documento oficial. Nunca apresente a sugestão como um fato confirmado.
- Responda SOMENTE com o objeto JSON solicitado, sem nenhum texto fora do JSON.`;

@Injectable()
export class PgrAiService {
  private readonly client = new Anthropic();
  private readonly logger = new Logger(PgrAiService.name);

  constructor(private readonly prisma: PrismaService) {}

  async suggestHazards(dto: SuggestHazardsDto) {
    const schema = {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              category: { type: "string", enum: ["FISICO", "QUIMICO", "BIOLOGICO", "ERGONOMICO", "ACIDENTE"] },
              description: { type: "string" },
              damagePotential: { type: "string" },
            },
            required: ["name", "category", "description", "damagePotential"],
            additionalProperties: false,
          },
        },
      },
      required: ["suggestions"],
      additionalProperties: false,
    };

    const userPrompt = [
      `Descrição da atividade do GHE: ${dto.activityDescription}`,
      dto.localDescription ? `Local: ${dto.localDescription}` : null,
      dto.category ? `Categoria de interesse (opcional, priorize-a se fizer sentido): ${dto.category}` : null,
      "",
      "Liste de 3 a 6 perigos/agentes de risco plausíveis para esta atividade, cobrindo as categorias aplicáveis entre FISICO, QUIMICO, BIOLOGICO, ERGONOMICO e ACIDENTE conforme a metodologia da NR-01.",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await this.runJsonSuggestion<{ suggestions: unknown[] }>(userPrompt, schema);
    return { ...result, disclaimer: AI_DISCLAIMER };
  }

  async suggestConsequences(dto: SuggestConsequencesDto) {
    const schema = {
      type: "object",
      properties: {
        typicalInjuries: { type: "string" },
      },
      required: ["typicalInjuries"],
      additionalProperties: false,
    };

    const userPrompt = [
      `Perigo/agente de risco: ${dto.hazardName} (categoria ${dto.category})`,
      dto.activityDescription ? `Contexto da atividade: ${dto.activityDescription}` : null,
      "",
      "Descreva, em um parágrafo técnico curto, as possíveis lesões ou agravos à saúde típicos decorrentes da exposição a este perigo nesta atividade.",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await this.runJsonSuggestion<{ typicalInjuries: string }>(userPrompt, schema);
    return { ...result, disclaimer: AI_DISCLAIMER };
  }

  async suggestSources(dto: SuggestSourcesDto) {
    const schema = {
      type: "object",
      properties: {
        sourceCircumstances: { type: "string" },
        propagationMeans: { type: "string" },
      },
      required: ["sourceCircumstances", "propagationMeans"],
      additionalProperties: false,
    };

    const userPrompt = [
      `Perigo/agente de risco: ${dto.hazardName} (categoria ${dto.category})`,
      dto.activityDescription ? `Contexto da atividade: ${dto.activityDescription}` : null,
      "",
      "Sugira: (1) as fontes ou circunstâncias geradoras típicas deste perigo nesta atividade; (2) o meio de propagação típico (ex.: pelo ar, por contato, por manuseio), quando aplicável.",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await this.runJsonSuggestion<{ sourceCircumstances: string; propagationMeans: string }>(
      userPrompt,
      schema,
    );
    return { ...result, disclaimer: AI_DISCLAIMER };
  }

  async suggestControls(dto: SuggestControlsDto) {
    const schema = {
      type: "object",
      properties: {
        adminControls: { type: "string" },
        engineeringControls: { type: "string" },
        epcMeasures: { type: "string" },
        epiMeasures: { type: "string" },
      },
      required: ["adminControls", "engineeringControls", "epcMeasures", "epiMeasures"],
      additionalProperties: false,
    };

    const userPrompt = [
      `Perigo/agente de risco: ${dto.hazardName} (categoria ${dto.category})`,
      dto.activityDescription ? `Contexto da atividade: ${dto.activityDescription}` : null,
      dto.exposureType ? `Tipo de exposição: ${dto.exposureType}` : null,
      dto.riskLevel ? `Nível de risco avaliado: ${dto.riskLevel}` : null,
      "",
      "Sugira medidas de prevenção e controle seguindo a hierarquia de controles (eliminação/substituição antes de controles administrativos e EPI), organizadas em quatro campos: medidas administrativas, controles de engenharia, medidas de proteção coletiva (EPC) e medidas de proteção individual (EPI). Se algum campo não se aplicar a este perigo, retorne uma string vazia nesse campo.",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await this.runJsonSuggestion<{
      adminControls: string;
      engineeringControls: string;
      epcMeasures: string;
      epiMeasures: string;
    }>(userPrompt, schema);
    return { ...result, disclaimer: AI_DISCLAIMER };
  }

  async improveActivityDescription(dto: ImproveActivityDescriptionDto) {
    const schema = {
      type: "object",
      properties: {
        improvedText: { type: "string" },
      },
      required: ["improvedText"],
      additionalProperties: false,
    };

    const userPrompt = [
      `Texto original (rascunho do usuário): "${dto.text}"`,
      "",
      "Reescreva este texto como uma descrição de atividade técnica, clara e objetiva, no padrão usado em documentos de PGR (NR-01), preservando integralmente o sentido original e sem adicionar informações, locais, quantidades ou detalhes que não estejam no texto original.",
    ].join("\n");

    const result = await this.runJsonSuggestion<{ improvedText: string }>(userPrompt, schema);
    return { ...result, disclaimer: AI_DISCLAIMER };
  }

  async evaluateRisk(dto: EvaluateRiskDto) {
    const schema = {
      type: "object",
      properties: {
        probability: { type: "integer" },
        severity: { type: "integer" },
        classification: { type: "string" },
        justification: { type: "string" },
      },
      required: ["probability", "severity", "classification", "justification"],
      additionalProperties: false,
    };

    const userPrompt = [
      `Perigo/agente de risco: ${dto.hazardName} (categoria ${dto.category})`,
      dto.activityDescription ? `Contexto da atividade: ${dto.activityDescription}` : null,
      dto.exposureType ? `Tipo de exposição: ${dto.exposureType}` : null,
      "",
      "Sugira uma avaliação preliminar de risco: probabilidade (1 a 5) e severidade (1 a 5), uma classificação textual curta (ex.: Aceitável, Tolerável, Moderado, Substancial, Intolerável) e uma justificativa técnica breve. Esta é apenas uma estimativa inicial — deixe claro na justificativa que ela precisa ser confirmada por avaliação técnica (e, quando aplicável, medição) antes de ser adotada.",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await this.runJsonSuggestion<{
      probability: number;
      severity: number;
      classification: string;
      justification: string;
    }>(userPrompt, schema);

    const clamp = (n: number) => Math.min(5, Math.max(1, Math.round(n)));
    return {
      ...result,
      probability: clamp(result.probability),
      severity: clamp(result.severity),
      disclaimer: AI_DISCLAIMER,
    };
  }

  /**
   * Verificação de inconsistências — deliberadamente baseada em regras (sem chamada à IA):
   * são checagens determinísticas sobre dados já cadastrados, não geração de conteúdo novo.
   */
  async analyzeInconsistencies(tenantId: string, pgrId: string, assignments: RoleAssignmentClaim[]) {
    const where = companyScopeWhere(assignments, PERMISSIONS.PGR_READ, tenantId);
    const pgr = await this.prisma.pgr.findFirst({
      where: { ...where, id: pgrId, deletedAt: null },
      include: {
        ghes: { include: { functions: true, risks: { include: { hazard: true } } } },
        actions: true,
      },
    });
    if (!pgr) throw new NotFoundException("PGR não encontrado.");

    type Alert = {
      code: string;
      severity: "info" | "warning" | "error";
      message: string;
      entityType: "pgr" | "ghe" | "pgrRisk" | "hazard" | "pgrAction";
      entityId: string;
    };
    const alerts: Alert[] = [];

    if (!pgr.technicalResponsibleName) {
      alerts.push({
        code: "PGR_SEM_RESPONSAVEL_TECNICO",
        severity: "warning",
        message: "PGR sem responsável técnico preenchido.",
        entityType: "pgr",
        entityId: pgr.id,
      });
    }
    if (!pgr.validUntil) {
      alerts.push({
        code: "PGR_SEM_VALIDADE",
        severity: "warning",
        message: "PGR sem data de validade definida.",
        entityType: "pgr",
        entityId: pgr.id,
      });
    } else if (pgr.validUntil.getTime() < Date.now()) {
      alerts.push({
        code: "PGR_VENCIDO",
        severity: "error",
        message: "A data de validade deste PGR já passou.",
        entityType: "pgr",
        entityId: pgr.id,
      });
    }
    if (pgr.ghes.length === 0) {
      alerts.push({
        code: "PGR_SEM_GHE",
        severity: "error",
        message: "Nenhum GHE cadastrado neste PGR.",
        entityType: "pgr",
        entityId: pgr.id,
      });
    }

    for (const ghe of pgr.ghes) {
      if (ghe.functions.length === 0) {
        alerts.push({
          code: "GHE_SEM_FUNCAO",
          severity: "warning",
          message: `GHE "${ghe.name}" sem nenhum setor/cargo vinculado.`,
          entityType: "ghe",
          entityId: ghe.id,
        });
      }
      if (!ghe.activityDescription || ghe.activityDescription.trim().length < 10) {
        alerts.push({
          code: "GHE_SEM_DESCRICAO",
          severity: "info",
          message: `GHE "${ghe.name}" com descrição de atividade ausente ou muito curta.`,
          entityType: "ghe",
          entityId: ghe.id,
        });
      }
      if (ghe.risks.length === 0) {
        alerts.push({
          code: "GHE_SEM_RISCO",
          severity: "warning",
          message: `GHE "${ghe.name}" sem nenhum risco avaliado.`,
          entityType: "ghe",
          entityId: ghe.id,
        });
      }

      for (const risk of ghe.risks) {
        const hasControl = risk.adminControls || risk.engineeringControls || risk.epcMeasures || risk.epiMeasures;
        if ((risk.riskLevel === "HIGH" || risk.riskLevel === "CRITICAL") && !hasControl) {
          alerts.push({
            code: "RISCO_ALTO_SEM_CONTROLE",
            severity: "error",
            message: `Risco "${risk.hazard.name}" (GHE "${ghe.name}") classificado como ${
              risk.riskLevel === "CRITICAL" ? "crítico" : "alto"
            }, mas sem nenhuma medida de controle registrada.`,
            entityType: "pgrRisk",
            entityId: risk.id,
          });
        }
        if (!risk.classification) {
          alerts.push({
            code: "RISCO_SEM_CLASSIFICACAO",
            severity: "info",
            message: `Risco "${risk.hazard.name}" (GHE "${ghe.name}") sem classificação preenchida.`,
            entityType: "pgrRisk",
            entityId: risk.id,
          });
        }
        if (!risk.hazard.esocialCode) {
          alerts.push({
            code: "PERIGO_SEM_CODIGO_ESOCIAL",
            severity: "info",
            message: `Perigo "${risk.hazard.name}" sem código eSocial associado.`,
            entityType: "hazard",
            entityId: risk.hazard.id,
          });
        }
      }
    }

    const highRiskIds = new Set(
      pgr.ghes.flatMap((g) =>
        g.risks.filter((r) => r.riskLevel === "HIGH" || r.riskLevel === "CRITICAL").map((r) => r.id),
      ),
    );
    for (const action of pgr.actions) {
      if (action.pgrRiskId && highRiskIds.has(action.pgrRiskId) && !action.dueDate) {
        alerts.push({
          code: "ACAO_SEM_PRAZO",
          severity: "warning",
          message: "Ação de controle vinculada a risco alto/crítico sem prazo (data de vencimento) definido.",
          entityType: "pgrAction",
          entityId: action.id,
        });
      }
    }

    return { alerts, generatedAt: new Date().toISOString() };
  }

  private async runJsonSuggestion<T>(userPrompt: string, schema: Record<string, unknown>): Promise<T> {
    let response;
    try {
      response = await this.client.messages.create({
        model: "claude-opus-5",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        output_config: { format: { type: "json_schema", schema }, effort: "medium" },
        messages: [{ role: "user", content: userPrompt }],
      });
    } catch (err) {
      this.logger.error("Falha ao chamar a API da Anthropic", err instanceof Error ? err.stack : err);
      throw new InternalServerErrorException("Não foi possível obter uma sugestão da IA no momento.");
    }

    if (response.stop_reason === "refusal") {
      throw new InternalServerErrorException("A IA não conseguiu processar esta solicitação.");
    }

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new InternalServerErrorException("Resposta da IA em formato inesperado.");
    }

    try {
      return JSON.parse(textBlock.text) as T;
    } catch (err) {
      this.logger.error("Falha ao interpretar JSON da resposta da IA", err instanceof Error ? err.stack : err);
      throw new InternalServerErrorException("Não foi possível interpretar a resposta da IA.");
    }
  }
}
