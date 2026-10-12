import type { InspectionItemType } from "./types";

/**
 * Configuração de um item de checklist (tipo, complementos, peso, campo).
 * Fica guardada junto das opções do item (uma entrada reservada "__cfg:…"), então não depende de
 * mudança no banco; as telas filtram essa entrada com `visibleOptions`.
 */
export type ItemKind = "AVALIATIVO" | "TEXTO" | "DATA" | "LISTA";

export interface ItemConfig {
  kind: ItemKind;
  /** Peso do item (só avaliativo). */
  weight: number;
  comment: boolean;
  actionPlan: boolean;
  attachments: boolean;
  textField: "CURTO" | "LONGO";
  dateField: "HORA" | "DATA";
  listField: "UNICA" | "MULTIPLA";
  /** Opções da lista de seleção. */
  options: string[];
}

export const KIND_LABEL: Record<ItemKind, string> = {
  AVALIATIVO: "Avaliativo",
  TEXTO: "Texto",
  DATA: "Data",
  LISTA: "Lista de seleção",
};

const CFG_PREFIX = "__cfg:";

export function blankConfig(kind: ItemKind = "AVALIATIVO"): ItemConfig {
  return {
    kind,
    weight: 1,
    comment: false,
    actionPlan: false,
    attachments: false,
    textField: "CURTO",
    dateField: "DATA",
    listField: "UNICA",
    options: [],
  };
}

export function visibleOptions(options: string[] | undefined): string[] {
  return (options ?? []).filter((o) => !o.startsWith(CFG_PREFIX));
}

export function responseTypeFor(kind: ItemKind): InspectionItemType {
  if (kind === "AVALIATIVO") return "CONFORME_NAO_CONFORME";
  if (kind === "LISTA") return "SELECAO_MULTIPLA";
  return "TEXTO_LIVRE";
}

/** Lê a configuração de um item salvo (itens antigos, sem a entrada reservada, são interpretados pelo tipo de resposta). */
export function decodeItem(item: { responseType: InspectionItemType; options: string[]; allowPhoto: boolean }): ItemConfig {
  const raw = item.options.find((o) => o.startsWith(CFG_PREFIX));
  if (!raw) {
    const kind: ItemKind =
      item.responseType === "TEXTO_LIVRE" ? "TEXTO" : item.responseType === "SELECAO_MULTIPLA" ? "LISTA" : "AVALIATIVO";
    return {
      ...blankConfig(kind),
      comment: true,
      actionPlan: true,
      attachments: item.allowPhoto,
      listField: "MULTIPLA",
      textField: "LONGO",
      options: visibleOptions(item.options),
    };
  }
  const map = new Map(
    raw
      .slice(CFG_PREFIX.length)
      .split(";")
      .map((pair) => {
        const i = pair.indexOf("=");
        return [pair.slice(0, i), pair.slice(i + 1)] as const;
      }),
  );
  const comps = (map.get("c") ?? "").split(",");
  const kind = (map.get("kind") as ItemKind) ?? "AVALIATIVO";
  return {
    kind,
    weight: Number(map.get("peso")) || 1,
    comment: comps.includes("comentario"),
    actionPlan: comps.includes("plano"),
    attachments: comps.includes("anexos"),
    textField: map.get("text") === "LONGO" ? "LONGO" : "CURTO",
    dateField: map.get("date") === "HORA" ? "HORA" : "DATA",
    listField: map.get("list") === "MULTIPLA" ? "MULTIPLA" : "UNICA",
    options: visibleOptions(item.options),
  };
}

/** Converte a configuração no que a API grava. */
export function encodeItem(cfg: ItemConfig): { responseType: InspectionItemType; options: string[]; allowPhoto: boolean } {
  const comps = [cfg.comment && "comentario", cfg.actionPlan && "plano", cfg.attachments && "anexos"].filter(Boolean).join(",");
  const raw = `${CFG_PREFIX}kind=${cfg.kind};peso=${cfg.weight};text=${cfg.textField};date=${cfg.dateField};list=${cfg.listField};c=${comps}`;
  const options = cfg.kind === "LISTA" ? cfg.options.map((o) => o.trim()).filter(Boolean) : [];
  return { responseType: responseTypeFor(cfg.kind), options: [raw, ...options], allowPhoto: cfg.attachments };
}
