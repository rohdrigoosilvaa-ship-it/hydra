/**
 * Cronograma legal do processo eleitoral da CIPA (NR-05) — todas as datas são
 * derivadas de um único offset em dias relativo à posse (dia 0).
 */

export type CipaElectionTypeInput = "PRIMEIRA" | "RENOVACAO";
export type CipaScheduleOriginInput = "LEGAL" | "PROGRAMADA";

export interface CipaScheduleStepInput {
  etapa: string;
  regra: string;
  origem: CipaScheduleOriginInput;
  baseLegal: string | null;
  diasRelativos: number;
  data: Date;
  order: number;
}

interface GerarCronogramaParams {
  type: CipaElectionTypeInput;
  posseDate: Date;
  dataTerminoMandatoAtual?: Date | null;
}

export function addDays(base: Date, dias: number): Date {
  const result = new Date(base);
  result.setUTCDate(result.getUTCDate() + dias);
  return result;
}

export function diasEntreDatas(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

type StepTemplate = Omit<CipaScheduleStepInput, "data" | "order">;

export function gerarCronogramaCipa({ type, posseDate, dataTerminoMandatoAtual }: GerarCronogramaParams): CipaScheduleStepInput[] {
  const renovacao = type === "RENOVACAO";

  const steps: StepTemplate[] = [
    {
      etapa: "Edital de convocação para eleição",
      origem: "LEGAL",
      baseLegal: "NR-05, 5.5.1",
      diasRelativos: -60,
      regra: renovacao
        ? "Prazo legal — mínimo 60 dias antes do término do mandato"
        : "Data programada — 60 dias antes da posse (a NR-05 só fixa este prazo quando já existe mandato em curso)",
    },
    {
      etapa: "Comunicar ao sindicato o início do processo eleitoral",
      origem: "LEGAL",
      baseLegal: "NR-05, 5.5.1.1",
      diasRelativos: -60,
      regra: "Prazo legal — comunicar ao sindicato o início do processo eleitoral, com antecedência",
    },
    {
      etapa: "Formação da comissão eleitoral",
      origem: "PROGRAMADA",
      baseLegal: null,
      diasRelativos: -58,
      regra: "Data programada — a NR-05 5.5.2 não fixa prazo específico",
    },
    {
      etapa: "Início das inscrições de candidatos",
      origem: "LEGAL",
      baseLegal: "NR-05, 5.5.3.b",
      diasRelativos: -52,
      regra: "Base do prazo legal — inscrição mínima de 15 dias corridos até o encerramento",
    },
    {
      etapa: "Publicação do edital de inscrição de candidatos",
      origem: "PROGRAMADA",
      baseLegal: null,
      diasRelativos: -52,
      regra: "Data programada — junto à abertura das inscrições",
    },
    {
      etapa: "Término das inscrições de candidatos",
      origem: "LEGAL",
      baseLegal: "NR-05, 5.5.3.b",
      diasRelativos: -37,
      regra: "Prazo legal — período mínimo de inscrição de 15 dias corridos",
    },
    {
      etapa: "Retirada do edital de inscrições",
      origem: "PROGRAMADA",
      baseLegal: null,
      diasRelativos: -36,
      regra: "Dia seguinte ao encerramento das inscrições",
    },
    {
      etapa: "Retirada do edital de convocação",
      origem: "PROGRAMADA",
      baseLegal: null,
      diasRelativos: -31,
      regra: "No dia da eleição",
    },
    {
      etapa: "Realização da eleição",
      origem: "LEGAL",
      baseLegal: "NR-05, 5.5.3.f",
      diasRelativos: -31,
      regra: renovacao
        ? "Prazo legal — mínimo 30 dias antes do término do mandato"
        : "Data programada — 31 dias antes da posse",
    },
    {
      etapa: "Realização da apuração",
      origem: "PROGRAMADA",
      baseLegal: null,
      diasRelativos: -31,
      regra: "Mesmo dia da eleição — a NR-05 5.5.3.i não fixa prazo",
    },
    {
      etapa: "Resultado da eleição — ata da eleição",
      origem: "PROGRAMADA",
      baseLegal: null,
      diasRelativos: -30,
      regra: "1 dia após a apuração",
    },
  ];

  if (renovacao) {
    steps.push(
      {
        etapa: "Curso para cipeiros (início do prazo)",
        origem: "PROGRAMADA",
        baseLegal: null,
        diasRelativos: -10,
        regra: "A NR-05 5.7.1 exige treinamento antes da posse, sem antecedência mínima definida",
      },
      {
        etapa: "Curso para cipeiros (prazo final)",
        origem: "LEGAL",
        baseLegal: "NR-05, 5.7.1",
        diasRelativos: -3,
        regra: "Treinamento deve estar concluído antes da posse",
      },
    );
  } else {
    steps.push({
      etapa: "Treinamento da CIPA (primeiro mandato)",
      origem: "LEGAL",
      baseLegal: "NR-05, 5.7.1.1",
      diasRelativos: 30,
      regra: "Máximo 30 dias após a posse",
    });
  }

  if (renovacao && dataTerminoMandatoAtual) {
    steps.push({
      etapa: "Término do mandato atual",
      origem: "LEGAL",
      baseLegal: "NR-05, 5.4.7",
      diasRelativos: diasEntreDatas(posseDate, dataTerminoMandatoAtual),
      regra: "Posse ocorre no primeiro dia útil após o término do mandato anterior",
    });
  }

  steps.push(
    {
      etapa: "Realização da posse — ata de posse dos novos membros",
      origem: "LEGAL",
      baseLegal: "NR-05, 5.4.7",
      diasRelativos: 0,
      regra: "Posse no primeiro dia útil após o término do mandato anterior",
    },
    {
      etapa: "Organização do calendário de reuniões mensais",
      origem: "PROGRAMADA",
      baseLegal: null,
      diasRelativos: 0,
      regra: "Boa prática — organizar já na reunião de posse",
    },
  );

  return steps
    .map((step) => ({ ...step, data: addDays(posseDate, step.diasRelativos) }))
    .sort((a, b) => a.data.getTime() - b.data.getTime() || a.diasRelativos - b.diasRelativos)
    .map((step, order) => ({ ...step, order }));
}
