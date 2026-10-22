import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import type { RoleAssignmentClaim } from "../../core/auth/jwt.types";
import type { RiskCategory } from "@hydra/db";
import { GheService } from "./ghe.service";
import { computeRiskLevel, riskLevelLabel } from "./risk-level.util";
import { parseRiskImportWorkbook, type ParsedRiskImportRow } from "./pgr-risks-import.util";

export type RiskImportRowStatus = "new" | "update" | "error";

export interface RiskImportRowResult {
  rowNumber: number;
  data: ParsedRiskImportRow;
  status: RiskImportRowStatus;
  errors: string[];
}

export interface RiskImportResult {
  fileName?: string;
  pgrId: string;
  totalRows: number;
  newCount: number;
  updatedCount: number;
  errorCount: number;
  rows: RiskImportRowResult[];
}

interface ValidRow {
  row: ParsedRiskImportRow;
  probability: number;
  severity: number;
  category: RiskCategory;
  /** Posição original na planilha — o lote da fase 3 roda em paralelo, então
   * não termina na mesma ordem em que começou; isso preserva a ordem de
   * exibição (mesma da planilha) no resultado final. */
  index: number;
}

function normalizeKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function validateScale(v: number | "__invalid__" | undefined, label: string): { value?: number; error?: string } {
  if (v === undefined) return { error: `${label} é obrigatória.` };
  if (v === "__invalid__") return { error: `${label} inválida — use um número.` };
  if (!Number.isInteger(v) || v < 1 || v > 4) return { error: `${label} deve ser um número inteiro entre 1 e 4.` };
  return { value: v };
}

/** Roda `items` por `worker` com no máximo `limit` chamadas em paralelo —
 * rápido o bastante pra caber no timeout da function, sem abrir uma conexão
 * por linha de uma vez só no banco. */
async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  async function next(): Promise<void> {
    const i = cursor++;
    if (i >= items.length) return;
    await worker(items[i]!);
    return next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
}

@Injectable()
export class PgrRisksImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ghe: GheService,
  ) {}

  parseFile(buffer: Buffer) {
    return parseRiskImportWorkbook(buffer);
  }

  async preview(
    tenantId: string,
    pgrId: string,
    assignments: RoleAssignmentClaim[],
    rows: ParsedRiskImportRow[],
    fileName?: string,
  ): Promise<RiskImportResult> {
    return this.process(tenantId, pgrId, assignments, rows, undefined, true, fileName);
  }

  async confirm(
    tenantId: string,
    pgrId: string,
    assignments: RoleAssignmentClaim[],
    rows: ParsedRiskImportRow[],
    userId: string,
    fileName?: string,
  ): Promise<RiskImportResult> {
    return this.process(tenantId, pgrId, assignments, rows, userId, false, fileName);
  }

  private async process(
    tenantId: string,
    pgrId: string,
    assignments: RoleAssignmentClaim[],
    rows: ParsedRiskImportRow[],
    userId: string | undefined,
    dryRun: boolean,
    fileName: string | undefined,
  ): Promise<RiskImportResult> {
    const pgr = await this.ghe.assertPgrEditable(tenantId, pgrId, assignments);
    const company = await this.prisma.company.findUnique({ where: { id: pgr.companyId } });

    const gheCache = new Map<string, string>();
    const hazardCache = new Map<string, string>();
    const deptCache = new Map<string, string>();
    const posCache = new Map<string, string>();
    const branchCache = new Map<string, string>();

    // Uma planilha real repete o mesmo GHE/Setor/Cargo/Perigo em dezenas ou
    // centenas de linhas — resolver e criar nome a nome geraria uma consulta
    // ao banco por linha (N+1), o que já se mostrou lento o bastante pra
    // estourar o timeout da function em planilhas grandes. Em vez disso:
    // 1) pré-carregamos tudo que já existe de uma vez; 2) descobrimos, numa
    // passada sem tocar o banco, quais nomes são realmente novos; 3) criamos
    // cada tipo de registro novo em um único createMany, não um por linha.
    const [allBranches, allDepartments, allPositions, allGhes, allHazards, existingRisks] = await Promise.all([
      this.prisma.branch.findMany({ where: { tenantId, companyId: pgr.companyId, deletedAt: null } }),
      this.prisma.department.findMany({ where: { tenantId, companyId: pgr.companyId, deletedAt: null } }),
      this.prisma.position.findMany({ where: { tenantId, companyId: pgr.companyId, deletedAt: null } }),
      this.prisma.ghe.findMany({ where: { tenantId, pgrId } }),
      this.prisma.hazard.findMany({ where: { tenantId, deletedAt: null } }),
      this.prisma.pgrRisk.findMany({ where: { pgrId }, select: { id: true, gheId: true, hazardId: true } }),
    ]);
    for (const b of allBranches) branchCache.set(normalizeKey(b.name), b.id);
    for (const d of allDepartments) deptCache.set(normalizeKey(d.name), d.id);
    for (const p of allPositions) posCache.set(normalizeKey(p.name), p.id);
    for (const g of allGhes) gheCache.set(normalizeKey(g.name), g.id);
    for (const h of allHazards) hazardCache.set(`${h.category}::${normalizeKey(h.name)}`, h.id);

    const riskKey = (gheId: string, hazardId: string) => `${gheId}::${hazardId}`;
    const existingRiskMap = new Map(existingRisks.map((r) => [riskKey(r.gheId, r.hazardId), r.id]));

    // ---- Fase 1: validar cada linha ----
    // `results` é preenchido por índice (não por push) porque a fase 3 roda
    // em paralelo e não termina na mesma ordem em que começou — indexar
    // garante que a ordem final bate com a da planilha original.
    const results: RiskImportRowResult[] = new Array(rows.length);
    const validRows: ValidRow[] = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index]!;
      const errors: string[] = [];

      if (!row.hazardName?.trim()) errors.push('Coluna "Perigo/Fator de Risco" é obrigatória.');
      if (!row.gheName?.trim()) errors.push('Coluna "GHE" é obrigatória.');
      if (!row.category) {
        errors.push("Não foi possível identificar o grupo de risco (Físico/Químico/Biológico/Ergonômico/Acidente).");
      }
      if (row.companyName && company && normalizeKey(row.companyName) !== normalizeKey(company.name)) {
        errors.push(`Empresa da planilha ("${row.companyName}") não corresponde à empresa deste PGR ("${company.name}").`);
      }
      if (row.exposureType === "__invalid__") {
        errors.push("Tipo de exposição inválido — use Eventual, Intermitente ou Permanente.");
      }
      if (row.evaluationCriteria === "__invalid__") {
        errors.push("Critério inválido — use Qualitativo ou Quantitativo.");
      }

      const probability = validateScale(row.probability, "Probabilidade");
      if (probability.error) errors.push(probability.error);
      const severity = validateScale(row.severity, "Severidade");
      if (severity.error) errors.push(severity.error);

      if (errors.length > 0) {
        results[index] = { rowNumber: row.rowNumber, data: row, status: "error", errors };
        continue;
      }

      validRows.push({
        row,
        probability: probability.value!,
        severity: severity.value!,
        category: row.category as RiskCategory,
        index,
      });
    }

    // ---- Fase 2: descobrir nomes novos (sem tocar o banco) e criar em lote ----
    if (!dryRun) {
      const newBranches = new Map<string, string>();
      const newDepartments = new Map<string, { name: string; branchKey?: string }>();
      const newPositions = new Map<string, string>();
      const newGhes = new Map<string, string>();
      const newHazards = new Map<string, { category: RiskCategory; name: string; description?: string }>();

      for (const { row, category } of validRows) {
        if (row.branchName) {
          const k = normalizeKey(row.branchName);
          if (!branchCache.has(k) && !newBranches.has(k)) newBranches.set(k, row.branchName.trim());
        }
        if (row.departmentName) {
          const k = normalizeKey(row.departmentName);
          if (!deptCache.has(k) && !newDepartments.has(k)) {
            newDepartments.set(k, {
              name: row.departmentName.trim(),
              branchKey: row.branchName ? normalizeKey(row.branchName) : undefined,
            });
          }
        }
        if (row.positionName) {
          const k = normalizeKey(row.positionName);
          if (!posCache.has(k) && !newPositions.has(k)) newPositions.set(k, row.positionName.trim());
        }
        const gheKey = normalizeKey(row.gheName!.trim());
        if (!gheCache.has(gheKey) && !newGhes.has(gheKey)) newGhes.set(gheKey, row.gheName!.trim());

        const hazardKey = `${category}::${normalizeKey(row.hazardName!.trim())}`;
        if (!hazardCache.has(hazardKey) && !newHazards.has(hazardKey)) {
          newHazards.set(hazardKey, { category, name: row.hazardName!.trim(), description: row.hazardAgent || undefined });
        }
      }

      if (newBranches.size > 0) {
        const names = [...newBranches.values()];
        await this.prisma.branch.createMany({ data: names.map((name) => ({ tenantId, companyId: pgr.companyId, name })) });
        const created = await this.prisma.branch.findMany({
          where: { tenantId, companyId: pgr.companyId, name: { in: names } },
        });
        for (const c of created) branchCache.set(normalizeKey(c.name), c.id);
      }

      if (newDepartments.size > 0) {
        const entries = [...newDepartments.values()];
        await this.prisma.department.createMany({
          data: entries.map((d) => ({
            tenantId,
            companyId: pgr.companyId,
            name: d.name,
            branchId: d.branchKey ? branchCache.get(d.branchKey) : undefined,
          })),
        });
        const created = await this.prisma.department.findMany({
          where: { tenantId, companyId: pgr.companyId, deletedAt: null, name: { in: entries.map((d) => d.name) } },
        });
        for (const c of created) deptCache.set(normalizeKey(c.name), c.id);
      }

      if (newPositions.size > 0) {
        const names = [...newPositions.values()];
        await this.prisma.position.createMany({ data: names.map((name) => ({ tenantId, companyId: pgr.companyId, name })) });
        const created = await this.prisma.position.findMany({
          where: { tenantId, companyId: pgr.companyId, deletedAt: null, name: { in: names } },
        });
        for (const c of created) posCache.set(normalizeKey(c.name), c.id);
      }

      if (newGhes.size > 0) {
        const names = [...newGhes.values()];
        await this.prisma.ghe.createMany({ data: names.map((name) => ({ tenantId, pgrId, name })) });
        const created = await this.prisma.ghe.findMany({ where: { tenantId, pgrId, name: { in: names } } });
        for (const c of created) gheCache.set(normalizeKey(c.name), c.id);
      }

      if (newHazards.size > 0) {
        const entries = [...newHazards.values()];
        await this.prisma.hazard.createMany({
          data: entries.map((h) => ({ tenantId, category: h.category, name: h.name, description: h.description })),
        });
        const created = await this.prisma.hazard.findMany({
          where: { tenantId, deletedAt: null, name: { in: entries.map((h) => h.name) } },
        });
        for (const c of created) hazardCache.set(`${c.category}::${normalizeKey(c.name)}`, c.id);
      }

      // Vínculos Setor+Cargo do GHE — mesma lógica: descobre o que falta e
      // cria tudo de uma vez, em vez de checar/criar linha a linha.
      const gheFunctionWanted = new Map<string, { gheId: string; departmentId?: string; positionId?: string }>();
      for (const { row } of validRows) {
        const gheId = gheCache.get(normalizeKey(row.gheName!.trim()));
        const departmentId = row.departmentName ? deptCache.get(normalizeKey(row.departmentName)) : undefined;
        const positionId = row.positionName ? posCache.get(normalizeKey(row.positionName)) : undefined;
        if (!gheId || (!departmentId && !positionId)) continue;
        const key = `${gheId}::${departmentId ?? ""}::${positionId ?? ""}`;
        if (!gheFunctionWanted.has(key)) gheFunctionWanted.set(key, { gheId, departmentId, positionId });
      }
      if (gheFunctionWanted.size > 0) {
        const involvedGheIds = [...new Set([...gheFunctionWanted.values()].map((f) => f.gheId))];
        const existingFunctions = await this.prisma.gheFunction.findMany({
          where: { tenantId, gheId: { in: involvedGheIds } },
          select: { gheId: true, departmentId: true, positionId: true },
        });
        const existingFnKey = new Set(
          existingFunctions.map((f) => `${f.gheId}::${f.departmentId ?? ""}::${f.positionId ?? ""}`),
        );
        const toCreate = [...gheFunctionWanted.entries()]
          .filter(([key]) => !existingFnKey.has(key))
          .map(([, f]) => ({ tenantId, gheId: f.gheId, departmentId: f.departmentId, positionId: f.positionId }));
        if (toCreate.length > 0) {
          await this.prisma.gheFunction.createMany({ data: toCreate });
        }
      }
    }

    // ---- Fase 3: gravar (ou simular) cada risco, com paralelismo limitado ----
    // Duas linhas podem apontar para o mesmo GHE+Perigo (planilha com linha
    // repetida) — se processadas em paralelo, ambas veriam "ainda não existe"
    // ao mesmo tempo e criariam dois riscos duplicados. Por isso agrupamos por
    // essa chave e processamos cada grupo em sequência (a última linha do
    // grupo "vence", como no comportamento sequencial original); grupos
    // diferentes continuam rodando em paralelo entre si.
    async function handleValidRow(this: PgrRisksImportService, entry: ValidRow): Promise<void> {
      const { row, probability, severity, category } = entry;
      const gheId = gheCache.get(normalizeKey(row.gheName!.trim()));
      const hazardId = hazardCache.get(`${category}::${normalizeKey(row.hazardName!.trim())}`);

      if (dryRun) {
        const status: RiskImportRowStatus =
          gheId && hazardId && existingRiskMap.has(riskKey(gheId, hazardId)) ? "update" : "new";
        results[entry.index] = { rowNumber: row.rowNumber, data: row, status, errors: [] };
        return;
      }
      if (!gheId || !hazardId) {
        // Não deveria acontecer (fase 2 cria tudo que falta) — mas se acontecer,
        // reporta como erro em vez de quebrar o restante do lote.
        results[entry.index] = {
          rowNumber: row.rowNumber,
          data: row,
          status: "error",
          errors: ["Falha interna ao resolver GHE/Perigo desta linha — tente importar novamente."],
        };
        return;
      }

      const payload = {
        typicalInjuries: row.typicalInjuries,
        sourceCircumstances: row.sourceCircumstances,
        propagationMeans: row.propagationMeans,
        exposureType: row.exposureType === "__invalid__" ? undefined : row.exposureType,
        evaluationCriteria: row.evaluationCriteria === "__invalid__" ? undefined : row.evaluationCriteria,
        exposureProfile: row.exposureProfile,
        classification: row.classification ?? riskLevelLabel(computeRiskLevel(probability, severity)),
        conclusion: row.conclusion,
        adminControls: row.adminControls,
        engineeringControls: row.engineeringControls,
        epcMeasures: row.epcMeasures,
        epiMeasures: row.epiMeasures,
        probability,
        severity,
        riskLevel: computeRiskLevel(probability, severity),
      };

      const existingId = existingRiskMap.get(riskKey(gheId, hazardId));
      if (existingId) {
        await this.prisma.pgrRisk.update({ where: { id: existingId }, data: { ...payload, updatedById: userId } });
        results[entry.index] = { rowNumber: row.rowNumber, data: row, status: "update", errors: [] };
      } else {
        const created = await this.prisma.pgrRisk.create({
          data: { ...payload, tenantId, pgrId, gheId, hazardId, createdById: userId, updatedById: userId },
        });
        existingRiskMap.set(riskKey(gheId, hazardId), created.id);
        results[entry.index] = { rowNumber: row.rowNumber, data: row, status: "new", errors: [] };
      }
    }

    const groupedByRiskKey = new Map<string, ValidRow[]>();
    for (const entry of validRows) {
      const gheId = gheCache.get(normalizeKey(entry.row.gheName!.trim()));
      const hazardId = hazardCache.get(`${entry.category}::${normalizeKey(entry.row.hazardName!.trim())}`);
      const key = gheId && hazardId ? riskKey(gheId, hazardId) : `__unresolved:${entry.index}`;
      const group = groupedByRiskKey.get(key);
      if (group) group.push(entry);
      else groupedByRiskKey.set(key, [entry]);
    }

    await runWithConcurrency(
      [...groupedByRiskKey.values()],
      8,
      async (group) => {
        for (const entry of group) await handleValidRow.call(this, entry);
      },
    );

    return {
      fileName,
      pgrId,
      totalRows: rows.length,
      newCount: results.filter((r) => r.status === "new").length,
      updatedCount: results.filter((r) => r.status === "update").length,
      errorCount: results.filter((r) => r.status === "error").length,
      rows: results,
    };
  }
}
