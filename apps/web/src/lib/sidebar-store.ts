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
      collapsed: false,
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      keepCollapsed: false,
      toggleKeepCollapsed: () => set((s) => ({ keepCollapsed: !s.keepCollapsed })),
      mobileOpen: false,
      setMobileOpen: (open) => set({ mobileOpen: open }),
    }),
    { name: "hydra-sidebar", partialize: (s) => ({ collapsed: s.collapsed, keepCollapsed: s.keepCollapsed }) },
  ),
);
