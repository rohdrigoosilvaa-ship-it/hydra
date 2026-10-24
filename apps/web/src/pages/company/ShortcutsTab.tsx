import { Link, useOutletContext } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { CompanyWorkspaceContext } from "./CompanyWorkspacePage";

export type ShortcutGroup = "funcionarios" | "seguranca" | "laudos" | "saude";

const GROUPS: Record<ShortcutGroup, { title: string; links: { to: string; label: string; hint: string }[] }> = {
  funcionarios: {
    title: "Funcionários",
    links: [
      { to: "/cadastros/estrutura/funcionarios", label: "Funcionários", hint: "Colaboradores da empresa" },
      { to: "/controle-vencimentos", label: "Controle de vencimentos", hint: "Documentos a vencer" },
      { to: "/epi", label: "EPI", hint: "Fichas de entrega" },
      { to: "/treinamentos", label: "Treinamentos", hint: "Treinamentos e validade" },
      { to: "/ordens-servico", label: "Ordem de Serviço", hint: "Ordens de serviço NR-01" },
    ],
  },
  seguranca: {
    title: "Segurança",
    links: [
      { to: "/pgr", label: "PGR", hint: "Programa de Gerenciamento de Riscos" },
      { to: "/nr01/ghe", label: "GHE", hint: "Grupos homogêneos de exposição" },
      { to: "/nr01/inventario", label: "Inventário de Riscos", hint: "Riscos por GHE" },
      { to: "/nr01/gro", label: "GRO", hint: "Gerenciamento de riscos" },
      { to: "/incidentes", label: "Incidentes", hint: "Ocorrências e CATs" },
      { to: "/cipa", label: "CIPA", hint: "Mandatos e eleições" },
    ],
  },
  laudos: {
    title: "Laudos",
    links: [
      { to: "/ltcat", label: "LTCAT", hint: "Laudo técnico das condições ambientais" },
      { to: "/laudos", label: "Laudos", hint: "Laudos e documentos técnicos" },
      { to: "/ppp", label: "PPP", hint: "Perfil Profissiográfico Previdenciário" },
    ],
  },
  saude: {
    title: "Saúde",
    links: [
      { to: "/saude", label: "Saúde Ocupacional", hint: "Exames e ASOs" },
      { to: "/previdenciario", label: "Afastamentos", hint: "Afastamentos e benefícios" },
      { to: "/absenteismo", label: "Absenteísmo", hint: "Faltas e atestados" },
    ],
  },
};

/** Abas Funcionários, Segurança, Laudos e Saúde: atalhos para os módulos, já com esta empresa selecionada. */
export function ShortcutsTab({ group }: { group: ShortcutGroup }) {
  const { search } = useOutletContext<CompanyWorkspaceContext>();
  const { title, links } = GROUPS[group];
  const q = search.trim().toLowerCase();
  const shown = links.filter((l) => !q || `${l.label} ${l.hint}`.toLowerCase().includes(q));
  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((l) => (
          <Link key={l.to} to={l.to} className="card flex items-center justify-between gap-3 transition-colors hover:bg-teal-tint/40">
            <div>
              <p className="font-medium text-ink">{l.label}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{l.hint}</p>
            </div>
            <ArrowRight size={16} className="shrink-0 text-ink-muted" />
          </Link>
        ))}
        {shown.length === 0 && <p className="text-sm text-ink-muted">Nada encontrado para “{search}”.</p>}
      </div>
    </div>
  );
}
