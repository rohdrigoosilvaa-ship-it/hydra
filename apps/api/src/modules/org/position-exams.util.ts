import type { Prisma } from "@hydra/db";

/**
 * Mantém os exames do cargo que vêm dos riscos ligados a ele: cada exame de cada risco do cargo existe uma vez
 * (vale a menor periodicidade); exame que veio de um risco já desvinculado sai; exame lançado à mão no cargo
 * (sem risco de origem) nunca é apagado.
 */
export async function syncPositionExams(db: Prisma.TransactionClient, tenantId: string, positionId: string) {
  const risks = await db.positionRisk.findMany({
    where: { positionId },
    select: { hazardId: true, hazard: { select: { exams: { select: { name: true, periodicityMonths: true } } } } },
  });
  const desired = new Map<string, { name: string; periodicityMonths: number; hazardId: string }>();
  for (const r of risks) {
    for (const e of r.hazard.exams) {
      const key = e.name.trim().toLowerCase();
      const cur = desired.get(key);
      if (!cur || e.periodicityMonths < cur.periodicityMonths) desired.set(key, { name: e.name.trim(), periodicityMonths: e.periodicityMonths, hazardId: cur?.hazardId ?? r.hazardId });
    }
  }
  const existing = await db.positionExam.findMany({ where: { positionId } });
  const byName = new Map(existing.map((x) => [x.name.trim().toLowerCase(), x]));

  const stale = existing.filter((x) => x.hazardId && !desired.has(x.name.trim().toLowerCase())).map((x) => x.id);
  if (stale.length) await db.positionExam.deleteMany({ where: { id: { in: stale } } });

  for (const [key, want] of desired) {
    const have = byName.get(key);
    if (!have) {
      await db.positionExam.create({ data: { tenantId, positionId, name: want.name, periodicityMonths: want.periodicityMonths, hazardId: want.hazardId } });
    } else if (have.hazardId) {
      await db.positionExam.update({ where: { id: have.id }, data: { periodicityMonths: want.periodicityMonths, hazardId: want.hazardId } });
    }
  }
}
