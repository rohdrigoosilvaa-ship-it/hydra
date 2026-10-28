/** Campos do PGR e contagens que entram no cálculo do andamento. */
export interface PgrProgressInput {
  validFrom: Date | null;
  validUntil: Date | null;
  technicalResponsibleName: string | null;
  procedimentoTrabalho: string | null;
  treinamentosNecessarios: string | null;
  episRecomendados: string | null;
  metasPrioridades: string | null;
  consideracoesFinais: string | null;
  scheduleIds: string[];
}
export interface PgrProgressCounts {
  ghes: number;
  risks: number;
  actions: number;
  cronograma: number;
  attachments: number;
}

const hasText = (v: string | null | undefined) => !!v && v.trim().length > 0;

/**
 * Andamento do PGR em 6 etapas — a única regra, usada na tela do PGR e no painel da empresa para os dois
 * mostrarem o mesmo número.
 */
export function computePgrProgress(pgr: PgrProgressInput, counts: PgrProgressCounts) {
  const steps = [
    { label: "Dados gerais", done: !!pgr.validFrom && !!pgr.validUntil && hasText(pgr.technicalResponsibleName) },
    { label: "GHE", done: counts.ghes > 0 },
    { label: "Inventário de riscos", done: counts.risks > 0 },
    {
      label: "Plano de ações",
      done:
        counts.actions > 0 ||
        pgr.scheduleIds.length > 0 ||
        [pgr.procedimentoTrabalho, pgr.treinamentosNecessarios, pgr.episRecomendados, pgr.metasPrioridades].some(hasText),
    },
    { label: "Cronograma", done: counts.cronograma > 0 },
    { label: "Finalização", done: hasText(pgr.consideracoesFinais) || counts.attachments > 0 },
  ];
  const done = steps.filter((s) => s.done).length;
  return {
    steps,
    percent: Math.round((done / steps.length) * 100),
    lastDone: [...steps].reverse().find((s) => s.done)?.label ?? null,
    next: steps.find((s) => !s.done)?.label ?? null,
  };
}
