import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PERMISSIONS } from "../../core/permissions/permissions";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import { allowedCompanyIds, companyScopeWhere, hasTenantWideAccess, relatedCompanyScopeWhere } from "../org/scope.util";

export type PendenciaOrigem = "Ação" | "Documento" | "Risco" | "EPI";
export type PendenciaCriticidade = "alta" | "media";

export interface Pendencia {
  id: string;
  origem: PendenciaOrigem;
  titulo: string;
  unidade: string | null;
  responsavel: string | null;
  prazo: string | null;
  criticidade: PendenciaCriticidade;
  status: string;
  link: string;
}

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Central de Pendências — agrega, a partir de dados já existentes no banco
 * (PgrAction, EmployeeDocument, PgrRisk), tudo que exige atenção do gestor
 * em um só lugar. Deliberadamente NÃO inclui treinamentos vencendo ou
 * inconsistências do eSocial — nenhum dos dois tem modelo/validação real
 * ainda, e inventar esses números violaria a regra de nunca simular dado.
 */
@Injectable()
export class PendenciasService {
  constructor(private readonly prisma: PrismaService) {}

  async getPendencias(tenantId: string, assignments: RoleAssignmentClaim[]): Promise<Pendencia[]> {
    const actionWhere = companyScopeWhere(assignments, PERMISSIONS.PGR_ACTION_READ, tenantId);
    const docWhere = companyScopeWhere(assignments, PERMISSIONS.EMPLOYEE_DOCUMENT_READ, tenantId);
    const riskWhere = relatedCompanyScopeWhere(assignments, PERMISSIONS.PGR_READ, tenantId, "pgr");
    const epiDeliveryWhere = hasTenantWideAccess(assignments, PERMISSIONS.EPI_READ)
      ? { tenantId, status: "ATIVA" as const }
      : { tenantId, status: "ATIVA" as const, companyId: { in: allowedCompanyIds(assignments, PERMISSIONS.EPI_READ) } };

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * DIA_MS);
    const in30Days = new Date(now.getTime() + 30 * DIA_MS);

    const [actions, documents, criticalRisks, epiItems] = await Promise.all([
      this.prisma.pgrAction.findMany({
        where: {
          ...actionWhere,
          status: { notIn: ["DONE", "CANCELED"] },
          dueDate: { not: null, lt: in7Days },
        },
        select: { id: true, description: true, companyId: true, responsibleId: true, dueDate: true, status: true },
      }),
      this.prisma.employeeDocument.findMany({
        where: { ...docWhere, expiryDate: { not: null, lt: in30Days } },
        select: {
          id: true,
          type: true,
          name: true,
          expiryDate: true,
          employee: { select: { name: true, company: { select: { name: true } } } },
        },
      }),
      this.prisma.pgrRisk.findMany({
        where: { ...riskWhere, riskLevel: "CRITICAL" },
        select: {
          id: true,
          hazard: { select: { name: true } },
          ghe: { select: { name: true, pgr: { select: { companyId: true } } } },
          actions: { select: { status: true } },
        },
      }),
      this.prisma.epiDeliveryItem.findMany({
        where: { tenantId, expiresAt: { not: null, lt: in30Days }, delivery: epiDeliveryWhere },
        select: {
          id: true,
          epiName: true,
          expiresAt: true,
          deliveryId: true,
          delivery: { select: { employeeName: true, companyId: true } },
        },
      }),
    ]);

    const companyIds = Array.from(new Set(actions.map((a) => a.companyId).filter((v): v is string => !!v)));
    const responsibleIds = Array.from(new Set(actions.map((a) => a.responsibleId).filter((v): v is string => !!v)));
    // criticalRisks vem de PgrRisk — o Ghe referenciado é sempre do mesmo Pgr, nunca de um LTCAT.
    const riskCompanyIds = Array.from(new Set(criticalRisks.map((r) => r.ghe.pgr!.companyId)));
    const epiCompanyIds = Array.from(new Set(epiItems.map((i) => i.delivery.companyId)));
    const allCompanyIds = Array.from(new Set([...companyIds, ...riskCompanyIds, ...epiCompanyIds]));

    const [companies, users] = await Promise.all([
      allCompanyIds.length
        ? this.prisma.company.findMany({ where: { id: { in: allCompanyIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
      responsibleIds.length
        ? this.prisma.user.findMany({ where: { id: { in: responsibleIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
    ]);
    const companyNameById = new Map(companies.map((c) => [c.id, c.name]));
    const userNameById = new Map(users.map((u) => [u.id, u.name]));

    const pendencias: Pendencia[] = [];

    for (const a of actions) {
      const overdue = a.dueDate!.getTime() < now.getTime();
      pendencias.push({
        id: `action-${a.id}`,
        origem: "Ação",
        titulo: a.description,
        unidade: a.companyId ? (companyNameById.get(a.companyId) ?? null) : null,
        responsavel: a.responsibleId ? (userNameById.get(a.responsibleId) ?? null) : null,
        prazo: a.dueDate!.toISOString(),
        criticidade: overdue ? "alta" : "media",
        status: overdue ? "Atrasada" : "Próxima do vencimento",
        link: "/acoes",
      });
    }

    for (const d of documents) {
      const overdue = d.expiryDate!.getTime() < now.getTime();
      pendencias.push({
        id: `doc-${d.id}`,
        origem: "Documento",
        titulo: `${d.type}${d.name ? ` — ${d.name}` : ""} · ${d.employee.name}`,
        unidade: d.employee.company?.name ?? null,
        responsavel: d.employee.name,
        prazo: d.expiryDate!.toISOString(),
        criticidade: overdue ? "alta" : "media",
        status: overdue ? "Vencido" : "Próximo do vencimento",
        link: "/controle-vencimentos",
      });
    }

    for (const r of criticalRisks) {
      const hasCompletedAction = r.actions.some((a) => a.status === "DONE");
      if (hasCompletedAction) continue;
      pendencias.push({
        id: `risk-${r.id}`,
        origem: "Risco",
        titulo: `Risco crítico: ${r.hazard.name} (GHE ${r.ghe.name})`,
        unidade: companyNameById.get(r.ghe.pgr!.companyId) ?? null,
        responsavel: null,
        prazo: null,
        criticidade: "alta",
        status: "Sem ação concluída",
        link: "/nr01/inventario",
      });
    }

    for (const it of epiItems) {
      const overdue = it.expiresAt!.getTime() < now.getTime();
      pendencias.push({
        id: `epi-${it.id}`,
        origem: "EPI",
        titulo: `EPI ${it.epiName} · ${it.delivery.employeeName}`,
        unidade: companyNameById.get(it.delivery.companyId) ?? null,
        responsavel: it.delivery.employeeName,
        prazo: it.expiresAt!.toISOString(),
        criticidade: overdue ? "alta" : "media",
        status: overdue ? "Vencido" : "Próximo do vencimento",
        link: `/epi/${it.deliveryId}`,
      });
    }

    return pendencias.sort((a, b) => {
      if (a.criticidade !== b.criticidade) return a.criticidade === "alta" ? -1 : 1;
      if (!a.prazo) return 1;
      if (!b.prazo) return -1;
      return new Date(a.prazo).getTime() - new Date(b.prazo).getTime();
    });
  }
}
