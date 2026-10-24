import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  /** Sidebar recolhida (~72px, só ícones) no desktop — persistida entre sessões. */
  collapsed: boolean;
  toggleCollapsed: () => void;
  /** Menu "recolhido": as seções começam fechadas e não se abrem sozinhas ao navegar — só quando o usuário abre. */
  keepCollapsed: boolean;
  toggleKeepCollapsed: () => void;
  /** Drawer mobile aberto — nunca persistido (sempre começa fechado). */
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: true,
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      keepCollapsed: false,
      toggleKeepCollapsed: () => set((s) => ({ keepCollapsed: !s.keepCollapsed })),
      mobileOpen: false,
      setMobileOpen: (open) => set({ mobileOpen: open }),
    }),
    {
      name: "hydra-sidebar",
      // v2: o menu passa a começar oculto (só ícones) e abrir ao passar o mouse; zera a preferência antiga.
      version: 2,
      migrate: () => ({ collapsed: true, keepCollapsed: false }),
      partialize: (s) => ({ collapsed: s.collapsed, keepCollapsed: s.keepCollapsed }),
    },
  ),
);
