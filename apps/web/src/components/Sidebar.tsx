import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Check, ChevronDown, ChevronRight, Loader2, type LucideIcon } from "lucide-react";
import { api } from "../lib/api";
import { useAuthStore } from "../lib/auth-store";
import { useSidebarStore } from "../lib/sidebar-store";
import { Logo } from "./Logo";
import { HYDRA_ROLE_LABELS, type HydraRole } from "../lib/types";
import {
  filterSections,
  filterTopItems,
  nodeMatchesPath,
  type NavActionItem,
  type NavLinkItem,
  type NavNode,
  type NavSection,
} from "../lib/nav-tree";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

function flattenLinks(nodes: NavNode[]): (NavLinkItem | NavActionItem)[] {
  const out: (NavLinkItem | NavActionItem)[] = [];
  for (const node of nodes) {
    if (node.kind === "group") out.push(...flattenLinks(node.children));
    else out.push(node);
  }
  return out;
}

type ActionStatus = "idle" | "loading" | "done";

/** Executa uma atualização real (refaz o fetch de `/dashboard/companies`) com
 * feedback visual de estado — "Atualizar dados" → "Atualizando…" → "Dados atualizados". */
function useDataRefresh() {
  const [status, setStatus] = useState<ActionStatus>("idle");

  async function run() {
    if (status === "loading") return;
    setStatus("loading");
    try {
      await api.get("/dashboard/companies");
    } catch {
      // silencioso — o botão volta ao estado normal mesmo se a chamada falhar
    } finally {
      setStatus("done");
      setTimeout(() => setStatus("idle"), 1800);
    }
  }

  return { status, run };
}

function NavAction({ item, collapsed }: { item: NavActionItem; collapsed: boolean }) {
  const Icon = item.icon;
  const { status, run } = useDataRefresh();
  const label = status === "loading" ? "Atualizando…" : status === "done" ? "Dados atualizados" : item.label;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={run}
        className="group relative flex items-center justify-center rounded-md py-2.5 text-sidebar-ink-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-ink"
      >
        {status === "loading" ? (
          <Loader2 size={18} strokeWidth={2} className="animate-spin" />
        ) : status === "done" ? (
          <Check size={18} strokeWidth={2} className="text-sidebar-active-text" />
        ) : (
          <Icon size={18} strokeWidth={2} />
        )}
        <span className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs font-medium text-paper opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100">
          {label}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={status === "loading"}
      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
        status === "done" ? "text-sidebar-active-text" : "text-sidebar-ink-muted hover:bg-sidebar-hover hover:text-sidebar-ink"
      }`}
    >
      {status === "loading" ? (
        <Loader2 size={16} strokeWidth={2} className="animate-spin" />
      ) : status === "done" ? (
        <Check size={16} strokeWidth={2} />
      ) : (
        <Icon size={16} strokeWidth={2} />
      )}
      <span className="flex-1 truncate text-left">{label}</span>
    </button>
  );
}

/** Ícone + tooltip flutuante — usado no modo recolhido (rail de ~72px). */
function CollapsedLink({ item }: { item: NavLinkItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `group relative flex items-center justify-center rounded-md py-2.5 transition-colors ${
          isActive ? "bg-sidebar-active text-sidebar-active-text" : "text-sidebar-ink-muted hover:bg-sidebar-hover hover:text-sidebar-ink"
        }`
      }
    >
      <Icon size={18} strokeWidth={2} />
      <span className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs font-medium text-paper opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100">
        {item.label}
      </span>
    </NavLink>
  );
}

function linkChildren(item: NavLinkItem, isActive: boolean, depth: number) {
  const Icon = item.icon;
  return (
    <>
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-sidebar-active-text" />
      )}
      <Icon size={depth === 0 ? 16 : 15} strokeWidth={2} />
      <span className="flex-1 truncate text-left">{item.label}</span>
    </>
  );
}

function NavLeaf({ item, depth }: { item: NavLinkItem; depth: number }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `relative flex items-center gap-2.5 rounded-md py-2 text-sm transition-colors ${
          depth === 0 ? "px-3" : "px-3"
        } ${isActive ? "font-medium text-sidebar-active-text" : "text-sidebar-ink-muted hover:bg-sidebar-hover hover:text-sidebar-ink"} ${
          isActive ? "bg-sidebar-active" : ""
        }`
      }
    >
      {({ isActive }) => linkChildren(item, isActive, depth)}
    </NavLink>
  );
}

function NavGroup({
  node,
  depth,
  openMap,
  onToggle,
  pathname,
}: {
  node: Extract<NavNode, { kind: "group" }>;
  depth: number;
  openMap: Record<string, boolean>;
  onToggle: (id: string) => void;
  pathname: string;
}) {
  const Icon: LucideIcon = node.icon;
  const open = openMap[node.id] ?? true;
  const active = nodeMatchesPath(node, pathname);

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(node.id)}
        className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
          active ? "text-sidebar-ink" : "text-sidebar-ink-muted"
        } hover:bg-sidebar-hover hover:text-sidebar-ink`}
      >
        <Icon size={depth === 0 ? 16 : 15} strokeWidth={2} />
        <span className="flex-1 truncate text-left">{node.label}</span>
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>
      <div
        className={`ml-3 flex flex-col gap-0.5 overflow-hidden border-l border-sidebar-border pl-2 transition-[max-height] duration-200 ease-in-out ${
          open ? "max-h-[32rem] py-0.5" : "max-h-0"
        }`}
      >
        {node.children.map((child) => (
          <NavNodeRenderer key={child.kind === "link" ? child.to : child.id} node={child} depth={depth + 1} openMap={openMap} onToggle={onToggle} pathname={pathname} />
        ))}
      </div>
    </div>
  );
}

function NavNodeRenderer({
  node,
  depth,
  openMap,
  onToggle,
  pathname,
}: {
  node: NavNode;
  depth: number;
  openMap: Record<string, boolean>;
  onToggle: (id: string) => void;
  pathname: string;
}) {
  if (node.kind === "action") return <NavAction item={node} collapsed={false} />;
  if (node.kind === "link") return <NavLeaf item={node} depth={depth} />;
  return <NavGroup node={node} depth={depth} openMap={openMap} onToggle={onToggle} pathname={pathname} />;
}

export function Sidebar() {
  const assignments = useAuthStore((s) => s.user?.assignments ?? []);
  const user = useAuthStore((s) => s.user);
  const collapsed = useSidebarStore((s) => s.collapsed);
  const mobileOpen = useSidebarStore((s) => s.mobileOpen);
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);
  const location = useLocation();

  const visibleTop = filterTopItems(assignments);
  const visibleSections = filterSections(assignments);

  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  // Ao navegar, revela (nunca colapsa) a cadeia de seções/grupos que contém a rota ativa —
  // preserva o que o usuário já abriu/fechou manualmente em outros lugares.
  useEffect(() => {
    setOpenMap((prev) => {
      const next = { ...prev };
      for (const section of visibleSections) {
        if (section.items.some((i) => nodeMatchesPath(i, location.pathname))) next[section.id] = true;
      }
      const reveal = (nodes: NavNode[]) => {
        for (const n of nodes) {
          if (n.kind === "group") {
            if (nodeMatchesPath(n, location.pathname)) next[n.id] = true;
            reveal(n.children);
          }
        }
      };
      for (const section of visibleSections) reveal(section.items);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  function toggle(id: string) {
    setOpenMap((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  }

  function isSectionOpen(section: NavSection) {
    return openMap[section.id] ?? true;
  }

  // Hover só expande temporariamente quando a sidebar está recolhida no desktop —
  // não muda nada no modo expandido nem no drawer mobile.
  const [hovering, setHovering] = useState(false);
  const expandedOnHover = collapsed && hovering && !mobileOpen;
  const railMode = collapsed && !hovering && !mobileOpen;

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Reserva o espaço no layout flex — largura fixa, nunca muda com o hover
          (só o <aside> abaixo, que é fixed, cresce visualmente por cima do conteúdo). */}
      <div
        className={`hidden flex-none md:block ${collapsed ? "md:w-[72px]" : "md:w-[260px]"}`}
        aria-hidden="true"
      />

      <aside
        onMouseEnter={() => collapsed && setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className={`fixed inset-y-0 left-0 z-50 flex w-[85%] max-w-xs flex-none flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-[transform,width] duration-200 ease-in-out md:max-w-none md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed && !hovering ? "md:w-[72px]" : "md:w-[260px]"} ${expandedOnHover ? "md:shadow-xl" : ""}`}
      >
        <div className={`flex items-center border-b border-sidebar-border px-4 py-5 ${railMode ? "justify-center px-2" : ""}`}>
          <Logo variant={railMode ? "mark" : "full"} />
        </div>

        <nav className="sidebar-scroll flex flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden px-3 py-4">
          {railMode ? (
            <div className="flex flex-col gap-1">
              {visibleTop.map((item) => (
                <CollapsedLink key={item.to} item={item} />
              ))}
              <div className="my-1 border-t border-sidebar-border" />
              {visibleSections.map((section) => (
                <div key={section.id} className="flex flex-col gap-1 border-b border-sidebar-border pb-1 last:border-none">
                  {flattenLinks(section.items).map((item) =>
                    item.kind === "action" ? (
                      <NavAction key={item.id} item={item} collapsed />
                    ) : (
                      <CollapsedLink key={item.to} item={item} />
                    ),
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                {visibleTop.map((item) => (
                  <NavLeaf key={item.to} item={item} depth={0} />
                ))}
              </div>

              {visibleSections.map((section) => (
                <div key={section.id}>
                  <button
                    type="button"
                    onClick={() => toggle(section.id)}
                    className="mb-1.5 flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-xs font-semibold uppercase tracking-wide text-sidebar-ink-muted hover:text-sidebar-ink"
                  >
                    <span className="flex-1">{section.label}</span>
                    {isSectionOpen(section) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </button>
                  <div
                    className={`flex flex-col gap-0.5 overflow-hidden transition-[max-height] duration-200 ease-in-out ${
                      isSectionOpen(section) ? "max-h-[48rem]" : "max-h-0"
                    }`}
                  >
                    {section.items.map((node) => (
                      <NavNodeRenderer
                        key={node.kind === "link" ? node.to : node.id}
                        node={node}
                        depth={0}
                        openMap={openMap}
                        onToggle={toggle}
                        pathname={location.pathname}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </nav>

        <div className={`flex flex-col gap-1 border-t border-sidebar-border px-3 py-3 ${railMode ? "items-center px-2" : ""}`}>
          {user && (
            <div className={`mt-2 flex items-center gap-2.5 rounded-md px-2 py-2 ${railMode ? "justify-center px-0" : ""}`}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-active text-xs font-semibold text-sidebar-active-text">
                {getInitials(user.name)}
              </div>
              {!railMode && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-sidebar-ink">{user.name}</p>
                  <p className="truncate text-xs text-sidebar-ink-muted">
                    {HYDRA_ROLE_LABELS[(user.assignments[0]?.role as HydraRole) ?? "COLABORADOR"] ?? "Usuário"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
