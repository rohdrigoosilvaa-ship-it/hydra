import type { LucideIcon } from "lucide-react";
import { NavLink, Outlet, useOutletContext } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Briefcase,
  ClipboardList,
  FileBadge,
  FileCheck2,
  FileText,
  FlaskConical,
  GraduationCap,
  HardHat,
  HeartPulse,
  House,
  Network,
  Scale,
  ShieldCheck,
  Siren,
  Stethoscope,
  TriangleAlert,
  CalendarRange,
  Users,
  CalendarClock,
  UserX,
} from "lucide-react";
import type { CompanyWorkspaceContext } from "./CompanyWorkspacePage";

interface SubTab {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Barras de sub-abas de cada aba do topo da empresa. */
export const SECTION_TABS: Record<"mapeamento" | "funcionarios" | "seguranca" | "laudos" | "saude", SubTab[]> = {
  mapeamento: [
    { to: "dashboard", label: "Dashboard", icon: BarChart3 },
    { to: "ambientes", label: "Ambiente", icon: House },
    { to: "ghe", label: "GHE", icon: Briefcase },
    { to: "cbo", label: "Consultar CBO", icon: FileText },
  ],
  funcionarios: [
    { to: "lista", label: "Funcionários", icon: Users },
    { to: "vencimentos", label: "Controle de Vencimento", icon: CalendarClock },
    { to: "epi", label: "EPI", icon: HardHat },
    { to: "treinamentos", label: "Treinamentos", icon: GraduationCap },
  ],
  seguranca: [
    { to: "ghe", label: "GHE", icon: Network },
    { to: "riscos", label: "Riscos", icon: TriangleAlert },
    { to: "plano-acoes", label: "Plano / Cronograma de Ações", icon: CalendarRange },
    { to: "incidentes", label: "Incidentes", icon: Siren },
    { to: "ordens-servico", label: "Ordem de Serviço", icon: FileCheck2 },
    { to: "ficha-epi", label: "Ficha de EPI", icon: ClipboardList },
  ],
  laudos: [
    { to: "pgr", label: "PGR", icon: ShieldCheck },
    { to: "pcmso", label: "PCMSO", icon: Stethoscope },
    { to: "ltcat", label: "LTCAT", icon: FileText },
    { to: "gro", label: "GRO", icon: Activity },
    { to: "ergonomico", label: "Laudo Ergonômico", icon: FlaskConical },
    { to: "ppp", label: "PPP", icon: FileBadge },
  ],
  saude: [
    { to: "ocupacional", label: "Saúde Ocupacional", icon: HeartPulse },
    { to: "afastamento", label: "Afastamento", icon: Scale },
    { to: "absenteismo", label: "Absenteísmo", icon: UserX },
  ],
};

/** Barra de sub-abas (no estilo do Mapeamento) com a tela escolhida logo abaixo. */
export function SectionLayout({ section }: { section: keyof typeof SECTION_TABS }) {
  const context = useOutletContext<CompanyWorkspaceContext>();
  const tabs = SECTION_TABS[section];
  return (
    <div>
      <nav className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-paper-raised p-1 shadow-sm" aria-label={section}>
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-teal-tint text-teal-deep" : "text-ink-muted hover:text-ink"
              }`
            }
          >
            <t.icon size={16} />
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-5">
        <Outlet context={context} />
      </div>
    </div>
  );
}
