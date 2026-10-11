import { createHash } from "crypto";
import type { Contract, ContractIssuer } from "@hydra/db";

/**
 * Motor de substituição de variáveis dos contratos — troca {{TOKEN}} pelo
 * valor correspondente. Usado tanto nas cláusulas do modelo quanto nos itens
 * de serviço (Cláusula 2ª), então os dois compartilham o mesmo dicionário.
 */
export function resolveTemplate(text: string, context: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, token: string) => context[token] ?? match);
}

/**
 * Resolve o título + corpo de cada cláusula do modelo contra o contexto do
 * contrato — mesma lógica usada na prévia e na geração do PDF, extraída aqui
 * pra também servir de base do hash de conteúdo assinado (ver hashResolvedClauses).
 */
export function resolveClauses(
  clauses: { order: number; title: string; body: string }[],
  context: Record<string, string>,
): { title: string; body: string }[] {
  return clauses.map((clause) => {
    const [before, after] = clause.body.split("{{SERVICOS_LISTA}}");
    const bodyResolved =
      after !== undefined
        ? [resolveTemplate(before ?? "", context), context.SERVICOS_LISTA, resolveTemplate(after, context)]
            .filter(Boolean)
            .join("\n\n")
        : resolveTemplate(clause.body, context);
    return { title: clause.title ? resolveTemplate(clause.title, context) : "", body: bodyResolved };
  });
}

/**
 * SHA-256 do texto resolvido das cláusulas — prova do conteúdo exato que o
 * signatário leu e concordou (usado na assinatura eletrônica dos contratos).
 */
export function hashResolvedClauses(clauses: { title: string; body: string }[]): string {
  const text = clauses.map((c) => `${c.title}\n${c.body}`).join("\n\n");
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function formatAddress(parts: {
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
}): string {
  const pieces = [
    parts.endereco ? `${parts.endereco}${parts.numero ? `, n.º ${parts.numero}` : ""}` : null,
    parts.complemento,
    parts.bairro ? `bairro ${parts.bairro}` : null,
    parts.cep ? `CEP ${parts.cep}` : null,
    parts.cidade,
    parts.estado ? `Estado ${parts.estado}` : null,
  ].filter((p): p is string => !!p);
  return pieces.join(", ");
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function byExtenso(value: number): string {
  // Extenso simplificado (unidades/dezenas/centenas comuns em valores de contrato).
  // Não pretende cobrir todo número real — cobre a faixa típica de mensalidades.
  const units = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const teens = [
    "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove",
  ];
  const tens = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const hundreds = [
    "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos",
  ];

  function threeDigits(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "cem";
    const h = Math.floor(n / 100);
    const rest = n % 100;
    const parts: string[] = [];
    if (h) parts.push(hundreds[h]!);
    if (rest) {
      if (rest < 10) parts.push(units[rest]!);
      else if (rest < 20) parts.push(teens[rest - 10]!);
      else {
        const t = Math.floor(rest / 10);
        const u = rest % 10;
        parts.push(u ? `${tens[t]} e ${units[u]}` : tens[t]!);
      }
    }
    return parts.join(" e ");
  }

  const intPart = Math.floor(value);
  const cents = Math.round((value - intPart) * 100);

  let reaisText: string;
  if (intPart === 0) {
    reaisText = "zero reais";
  } else if (intPart < 1000) {
    reaisText = `${threeDigits(intPart)} ${intPart === 1 ? "real" : "reais"}`;
  } else if (intPart < 1_000_000) {
    const thousands = Math.floor(intPart / 1000);
    const rest = intPart % 1000;
    const thousandsText = thousands === 1 ? "mil" : `${threeDigits(thousands)} mil`;
    reaisText = rest ? `${thousandsText} e ${threeDigits(rest)} reais` : `${thousandsText} reais`;
  } else {
    // Além de 1 milhão, cai pro formato numérico puro em vez de tentar por extenso.
    return currencyFormatter.format(value);
  }

  if (cents > 0) {
    const centsText = cents < 10 ? units[cents] : cents < 20 ? teens[cents - 10] : threeDigits(cents);
    reaisText += ` e ${centsText} centavo${cents === 1 ? "" : "s"}`;
  }

  return reaisText;
}

export function buildContractContext(
  contract: Contract,
  issuer: ContractIssuer | null,
  servicesLista: string,
): Record<string, string> {
  const enderecoContratante = formatAddress(contract);
  const enderecoContratada = issuer ? formatAddress(issuer) : "";

  const dataInicio = dateFormatter.format(new Date(contract.dataInicio));
  const dataVencimento = dateFormatter.format(new Date(contract.dataVencimento));
  const dataVencimentoPrimeiraParcela = contract.dataVencimentoPrimeiraParcela
    ? dateFormatter.format(new Date(contract.dataVencimentoPrimeiraParcela))
    : "";

  return {
    // CONTRATANTE
    RAZAO_SOCIAL: contract.razaoSocial,
    NOME_FANTASIA: contract.nomeFantasia ?? "",
    CNPJ: contract.cnpj,
    CIDADE: contract.cidade ?? "",
    ESTADO: contract.estado ?? "",
    ENDERECO_CONTRATANTE: enderecoContratante,
    REP_NOME: contract.repNome,
    REP_NACIONALIDADE: contract.repNacionalidade ?? "",
    REP_ESTADO_CIVIL: contract.repEstadoCivil ?? "",
    REP_PROFISSAO: contract.repProfissao ?? "",
    REP_RG: contract.repRg ?? "",
    REP_CPF: contract.repCpf ?? "",

    // CONTRATADA (ProtecSeg)
    CONTRATADA_NOME: issuer?.name ?? "",
    CONTRATADA_CNPJ: issuer?.cnpj ?? "",
    CONTRATADA_ENDERECO: enderecoContratada,
    CONTRATADA_CIDADE: issuer?.cidade ?? "",
    CONTRATADA_ESTADO: issuer?.estado ?? "",
    CONTRATADA_REP_NOME: issuer?.repNome ?? "",
    CONTRATADA_REP_NACIONALIDADE: issuer?.repNacionalidade ?? "",
    CONTRATADA_REP_ESTADO_CIVIL: issuer?.repEstadoCivil ?? "",
    CONTRATADA_REP_PROFISSAO: issuer?.repProfissao ?? "",
    CONTRATADA_REP_RG: issuer?.repRg ?? "",
    CONTRATADA_REP_CPF: issuer?.repCpf ?? "",

    // Termos
    QUANTIDADE_VIDAS: contract.quantidadeVidas != null ? String(contract.quantidadeVidas) : "",
    DATA_INICIO: dataInicio,
    PRAZO_MESES: String(contract.prazoMeses),
    DATA_VENCIMENTO: dataVencimento,
    VALOR_MENSALIDADE: currencyFormatter.format(contract.valorMensalidade),
    VALOR_MENSALIDADE_EXTENSO: byExtenso(contract.valorMensalidade),
    VALOR_PRIMEIRA_PARCELA:
      contract.valorPrimeiraParcela != null
        ? currencyFormatter.format(contract.valorPrimeiraParcela)
        : currencyFormatter.format(contract.valorMensalidade),
    VALOR_PRIMEIRA_PARCELA_EXTENSO: byExtenso(contract.valorPrimeiraParcela ?? contract.valorMensalidade),
    DATA_VENCIMENTO_PRIMEIRA_PARCELA: dataVencimentoPrimeiraParcela,
    DIA_VENCIMENTO_MENSAL: contract.diaVencimentoMensal != null ? String(contract.diaVencimentoMensal) : "",
    FORMA_PAGAMENTO: contract.formaPagamento ?? "",
    QTD_VISITAS: contract.qtdVisitas != null ? String(contract.qtdVisitas) : "",
    QTD_VISITAS_EXTENSO: contract.qtdVisitas != null ? byExtenso(contract.qtdVisitas).replace(" reais", "") : "",
    FREQUENCIA_VISITAS: contract.frequenciaVisitas ?? "",
    OBSERVACOES: contract.observacoes ?? "",
    SERVICOS_LISTA: servicesLista,

    // Data/local de assinatura
    DATA_ASSINATURA_EXTENSO: dataInicio,
  };
}
