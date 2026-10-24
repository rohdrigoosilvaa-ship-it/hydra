import { NavLink, Outlet, useOutletContext } from "react-router-dom";
import type { CompanyWorkspaceContext } from "./CompanyWorkspacePage";

const SUBTABS = [
  { to: "dashboard", label: "Dashboard" },
  { to: "ambientes", label: "Ambiente" },
  { to: "ghe", label: "GHE" },
  { to: "cbo", label: "Consultar CBO" },
];

/** Mapeamento: barra com Dashboard, Ambiente, GHE e Consultar CBO. */
export function MappingLayout() {
  const context = useOutletContext<CompanyWorkspaceContext>();
  return (
    <div>
      <nav className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Mapeamento">
        {SUBTABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-teal text-white" : "bg-paper-raised text-ink-muted hover:bg-teal-tint hover:text-ink"
              }`
            }
          >
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
