import { NavLink, Outlet, useOutletContext } from "react-router-dom";
import { BarChart3, Briefcase, FileText, House } from "lucide-react";
import type { CompanyWorkspaceContext } from "./CompanyWorkspacePage";

const SUBTABS = [
  { to: "dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "ambientes", label: "Ambiente", icon: House },
  { to: "ghe", label: "GHE", icon: Briefcase },
  { to: "cbo", label: "Consultar CBO", icon: FileText },
];

/** Mapeamento: barra com Dashboard, Ambiente, GHE e Consultar CBO. */
export function MappingLayout() {
  const context = useOutletContext<CompanyWorkspaceContext>();
  return (
    <div>
      <nav className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-paper-raised p-1 shadow-sm" aria-label="Mapeamento">
        {SUBTABS.map((t) => (
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
