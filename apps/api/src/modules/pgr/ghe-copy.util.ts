import type { Prisma } from "@hydra/db";

interface SourceGheFunction {
  departmentId: string | null;
  positionId: string | null;
  activityDescription: string | null;
}

interface SourceGhe {
  name: string;
  code: string | null;
  localDescription: string | null;
  activityDescription: string | null;
  functions: SourceGheFunction[];
}

/**
 * Copia a estrutura de GHE + vínculos de Setor/Cargo (GheFunction) pra um Pgr
 * ou Ltcat novo — usado tanto na revisão de PGR (copia do PGR anterior da
 * mesma empresa) quanto no LTCAT reaproveitando a estrutura do PGR aprovado
 * ou do LTCAT anterior. Nunca copia riscos/agentes — cada revisão/documento
 * reavalia isso do zero.
 */
export async function copyGheStructure(
  tx: Prisma.TransactionClient,
  tenantId: string,
  sourceGhes: SourceGhe[],
  owner: { pgrId: string } | { ltcatId: string },
): Promise<void> {
  for (const ghe of sourceGhes) {
    const newGhe = await tx.ghe.create({
      data: {
        tenantId,
        ...owner,
        name: ghe.name,
        code: ghe.code,
        localDescription: ghe.localDescription,
        activityDescription: ghe.activityDescription,
      },
    });
    if (ghe.functions.length) {
      await tx.gheFunction.createMany({
        data: ghe.functions.map((f) => ({
          tenantId,
          gheId: newGhe.id,
          departmentId: f.departmentId,
          positionId: f.positionId,
          activityDescription: f.activityDescription,
        })),
      });
    }
  }
}
