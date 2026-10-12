import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { companyScopeWhere } from "../org/scope.util";

@Injectable()
export class PgrValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verificação de inconsistências do PGR — checagens por regras sobre os dados já cadastrados.
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
}
