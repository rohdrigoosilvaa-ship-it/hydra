/**
 * Popula o catálogo de ocupações CBO (Classificação Brasileira de Ocupações),
 * dado de referência público e compartilhado entre tenants — não é recriado a
 * cada `prisma db seed`, roda uma vez separadamente:
 *   pnpm --filter @hydra/db exec tsx prisma/seed-cbo.ts
 *
 * Fonte: lista canônica oficial (código + termo), ver prisma/cbo-seed.csv.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseCsv(raw: string): { code: string; title: string }[] {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const [, ...rows] = lines; // descarta cabeçalho "codigo,termo"
  const seen = new Set<string>();
  const out: { code: string; title: string }[] = [];
  for (const line of rows) {
    const idx = line.indexOf(",");
    if (idx < 0) continue;
    const code = line.slice(0, idx).trim();
    const title = line.slice(idx + 1).trim();
    if (!code || !title || seen.has(code)) continue;
    seen.add(code);
    out.push({ code, title });
  }
  return out;
}

async function main() {
  const csvPath = join(__dirname, "cbo-seed.csv");
  const raw = readFileSync(csvPath, "utf-8");
  const occupations = parseCsv(raw);
  console.log(`Lendo ${occupations.length} ocupações de ${csvPath}...`);

  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < occupations.length; i += BATCH) {
    const batch = occupations.slice(i, i + BATCH);
    const result = await prisma.cboOccupation.createMany({ data: batch, skipDuplicates: true });
    inserted += result.count;
    console.log(`  ${Math.min(i + BATCH, occupations.length)}/${occupations.length} processados (${inserted} inseridos)`);
  }

  console.log(`Concluído: ${inserted} ocupações CBO inseridas.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
