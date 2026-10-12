import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Building2, ChevronRight, CircleHelp, LogOut, Menu, Search, ShieldAlert } from "lucide-react";
import { useAuthStore } from "../lib/auth-store";
import { useSidebarStore } from "../lib/sidebar-store";
import { resolveBreadcrumb } from "../lib/nav-tree";
import { api } from "../lib/api";
import type { Pendencia, SearchResult } from "../lib/types";
import { CompanyFilter } from "./CompanyFilter";

function useIsDesktop() {
  return () => (typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : true);
}

export function Topbar() {
  const { user, clearSession } = useAuthStore();
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebarStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [notifOpen, setNotifOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<Pendencia[]>("/pendencias")
      .then(setPendencias)
      .catch(() => setPendencias([]));
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    const handle = setTimeout(() => {
      api
        .get<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`)
        .then(setResults)
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!user) return null;

  const breadcrumb = resolveBreadcrumb(location.pathname);
  const altaCount = pendencias.filter((p) => p.criticidade === "alta").length;

  function handleMenuToggle() {
    if (isDesktop()) toggleCollapsed();
    else setMobileOpen(!mobileOpen);
  }

  async function handleLogout() {
    await api.logout().catch(() => undefined);
    clearSession();
  }

  function handleResultClick(link: string) {
    setSearchOpen(false);
    setQuery("");
    setResults(null);
    navigate(link);
  }

  return (
    <header className="flex items-center justify-between border-b border-line bg-paper-raised px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={handleMenuToggle}
          className="flex shrink-0 items-center justify-center rounded-md p-1.5 text-ink-muted transition-colors hover:bg-teal-tint hover:text-ink"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          <Menu size={18} />
        </button>

        <nav className="hidden min-w-0 items-center gap-1 truncate font-display text-xs font-medium text-ink-muted sm:flex">
          <span className="font-medium text-ink">ProtecOne</span>
          {breadcrumb.section && (
            <>
              <ChevronRight size={12} className="shrink-0" />
              <span>{breadcrumb.section}</span>
            </>
          )}
          {breadcrumb.trail.map((t) => (
            <span key={t} className="flex items-center gap-1">
              <ChevronRight size={12} className="shrink-0" />
              <span>{t}</span>
            </span>
          ))}
          <ChevronRight size={12} className="shrink-0" />
          <span className="truncate text-ink">{breadcrumb.label}</span>
        </nav>

        <span className="hidden shrink-0 items-center gap-1.5 rounded-md bg-teal-tint px-2.5 py-1 text-xs font-medium text-teal-deep lg:flex">
          <Building2 size={13} />
          {user.company ? user.company.name : "Todas as empresas"}
        </span>
        <div className="hidden lg:block">
          <CompanyFilter />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2">
        <div ref={searchRef} className="relative hidden w-full max-w-xs md:block">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            className="input w-full pl-8 text-sm"
            placeholder="Buscar funcionário, unidade, PGR…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
          />
          {searchOpen && query.trim().length >= 2 && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-md border border-line bg-paper-raised p-2 text-sm shadow-md">
              {results === null && <p className="px-2 py-2 text-xs text-ink-muted">Buscando…</p>}
              {results !== null && results.length === 0 && (
                <p className="px-2 py-2 text-xs text-ink-muted">Nada encontrado para "{query.trim()}".</p>
              )}
              {results !== null && results.length > 0 && (
                <ul className="max-h-80 overflow-y-auto">
                  {results.map((r, i) => (
                    <li key={`${r.type}-${r.link}-${i}`}>
                      <button
                        type="button"
                        onClick={() => handleResultClick(r.link)}
                        className="flex w-full flex-col items-start rounded px-2 py-1.5 text-left hover:bg-teal-tint"
                      >
                        <span className="text-ink">{r.label}</span>
                        <span className="text-xs text-ink-muted">
                          {r.type}
                          {r.sublabel ? ` · ${r.sublabel}` : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen((v) => !v);
              setHelpOpen(false);
            }}
            className="relative flex items-center justify-center rounded-md p-2 text-ink-muted transition-colors hover:bg-teal-tint hover:text-ink"
            aria-label="Notificações"
          >
            <Bell size={17} />
            {altaCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber px-1 font-mono text-[10px] font-medium text-white">
                {altaCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-md border border-line bg-paper-raised p-3 text-sm shadow-md">
                <p className="font-medium text-ink">Notificações</p>
                {pendencias.length === 0 ? (
                  <p className="mt-1 text-xs text-ink-muted">Nenhuma notificação no momento.</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1">
                    {pendencias.slice(0, 5).map((p) => (
                      <li key={p.id}>
                        <Link
                          to={p.link}
                          onClick={() => setNotifOpen(false)}
                          className="flex items-start gap-2 rounded px-1.5 py-1.5 hover:bg-teal-tint"
                        >
                          <ShieldAlert
                            size={13}
                            className={`mt-0.5 shrink-0 ${p.criticidade === "alta" ? "text-amber" : "text-ink-muted"}`}
                          />
                          <span className="text-xs text-ink">
                            {p.titulo}
                            <span className="block text-ink-muted">{p.origem}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  to="/pendencias"
                  onClick={() => setNotifOpen(false)}
                  className="mt-2 inline-block text-xs font-medium text-teal-deep hover:underline"
                >
                  Ver Central de Pendências →
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setHelpOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="flex items-center justify-center rounded-md p-2 text-ink-muted transition-colors hover:bg-teal-tint hover:text-ink"
            aria-label="Ajuda"
          >
            <CircleHelp size={17} />
          </button>
          {helpOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setHelpOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-md border border-line bg-paper-raised p-3 text-sm shadow-md">
                <p className="font-medium text-ink">Ajuda e Suporte</p>
                <p className="mt-1 text-xs text-ink-muted">Central de ajuda em desenvolvimento.</p>
                <Link to="/ajuda" onClick={() => setHelpOpen(false)} className="mt-2 inline-block text-xs font-medium text-teal-deep hover:underline">
                  Ver mais →
                </Link>
              </div>
            </>
          )}
        </div>

        <span className="hidden text-sm text-ink-muted md:inline">{user.name}</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-ink-muted transition-colors hover:bg-teal-tint hover:text-ink"
        >
          <LogOut size={15} /> <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
