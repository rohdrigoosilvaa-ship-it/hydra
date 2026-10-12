import type {
  ChecklistFrequency,
  ChecklistTemplateStatus,
  InspectionItemType,
  InspectionTemplate,
  InspectionTemplateItem,
} from "./types";

/** Tipos de resposta do criador de modelos (estilo formulário). */
export const RESPONSE_TYPES: { value: InspectionItemType; label: string }[] = [
  { value: "TEXTO_CURTO", label: "Resposta curta" },
  { value: "TEXTO_LONGO", label: "Parágrafo" },
  { value: "SELECAO_UNICA", label: "Multi escolha" },
  { value: "SELECAO_MULTIPLA", label: "Caixa de seleção" },
  { value: "LISTA_SUSPENSA", label: "Lista suspensa" },
  { value: "UPLOAD", label: "Upload de arquivo" },
  { value: "ESCALA", label: "Escala linear" },
  { value: "CLASSIFICACAO", label: "Classificação" },
  { value: "GRADE", label: "Grade de múltipla escolha" },
  { value: "DATA", label: "Data" },
  { value: "HORA", label: "Horário" },
];

/** Tipos de avaliação (geram não conformidade / plano de ação) e extras, oferecidos à parte. */
export const EXTRA_RESPONSE_TYPES: { value: InspectionItemType; label: string }[] = [
  { value: "CONFORME_NAO_CONFORME", label: "Conforme / Não conforme / Não aplicável" },
  { value: "SIM_NAO", label: "Sim / Não" },
  { value: "NUMERO", label: "Número" },
];

/** Tipos antigos (modelos criados antes da reformulação) — continuam funcionando. */
const LEGACY_LABEL: Partial<Record<InspectionItemType, string>> = {
  TEXTO_LIVRE: "Texto longo (antigo)",
  NOTA: "Nota (antigo)",
};

export function responseTypeLabel(type: InspectionItemType): string {
  return [...RESPONSE_TYPES, ...EXTRA_RESPONSE_TYPES].find((t) => t.value === type)?.label ?? LEGACY_LABEL[type] ?? type;
}

export const hasOptions = (type: InspectionItemType) =>
  type === "SELECAO_UNICA" || type === "SELECAO_MULTIPLA" || type === "LISTA_SUSPENSA";
/** Tipos "avaliativos", em que uma resposta negativa pode gerar não conformidade e plano de ação. */
export const isEvaluative = (type: InspectionItemType) => type === "CONFORME_NAO_CONFORME" || type === "SIM_NAO";

export const FREQUENCIES: { value: ChecklistFrequency; label: string }[] = [
  { value: "DIARIA", label: "Diária" },
  { value: "SEMANAL", label: "Semanal" },
  { value: "MENSAL", label: "Mensal" },
  { value: "POR_TURNO", label: "Por turno" },
  { value: "POR_EVENTO", label: "Por evento" },
  { value: "PERSONALIZADA", label: "Personalizada" },
];

export const STATUS_LABEL: Record<ChecklistTemplateStatus, string> = {
  RASCUNHO: "Rascunho",
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  ARQUIVADO: "Arquivado",
};

export const STATUS_STYLE: Record<ChecklistTemplateStatus, string> = {
  RASCUNHO: "bg-amber-tint text-amber",
  ATIVO: "bg-teal-tint text-teal-deep",
  INATIVO: "bg-line text-ink-muted",
  ARQUIVADO: "bg-line text-ink-muted",
};

export const HISTORY_ACTION_LABEL: Record<string, string> = {
  CRIADO: "Modelo criado",
  DUPLICADO: "Modelo duplicado",
  DADOS_ALTERADOS: "Dados alterados",
  ESTRUTURA_ALTERADA: "Estrutura alterada",
  STATUS_ALTERADO: "Situação alterada",
  NOVA_VERSAO: "Nova versão",
  EXCLUIDO: "Modelo removido",
};

/** Valores que uma regra condicional pode comparar, conforme o tipo da pergunta que a condiciona. */
export function conditionChoices(item: Pick<InspectionTemplateItem, "responseType" | "options">): { value: string; label: string }[] | null {
  if (item.responseType === "SIM_NAO") return [{ value: "SIM", label: "Sim" }, { value: "NAO", label: "Não" }];
  if (item.responseType === "CONFORME_NAO_CONFORME") {
    return [
      { value: "CONFORME", label: "Conforme" },
      { value: "NAO_CONFORME", label: "Não conforme" },
      { value: "NAO_APLICAVEL", label: "Não aplicável" },
    ];
  }
  if (hasOptions(item.responseType)) return item.options.map((o) => ({ value: o, label: o }));
  return null;
}

/** Perguntas de um modelo agrupadas por seção, na ordem de exibição. */
export function groupBySection(template: Pick<InspectionTemplate, "sections" | "items">) {
  const sections = [...template.sections].sort((a, b) => a.order - b.order);
  const items = [...template.items].sort((a, b) => a.order - b.order);
  const groups = sections.map((s) => ({ id: s.id as string | null, name: s.name, items: items.filter((i) => i.sectionId === s.id) }));
  const loose = items.filter((i) => !i.sectionId || !sections.some((s) => s.id === i.sectionId));
  if (loose.length) groups.unshift({ id: null, name: "Geral", items: loose });
  return groups;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
