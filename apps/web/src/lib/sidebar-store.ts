import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  /** Sidebar recolhida (~72px, só ícones) no desktop — persistida entre sessões. */
  collapsed: boolean;
  toggleCollapsed: () => void;
  /** Drawer mobile aberto — nunca persistido (sempre começa fechado). */
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      mobileOpen: false,
      setMobileOpen: (open) => set({ mobileOpen: open }),
    }),
    { name: "hydra-sidebar", partialize: (s) => ({ collapsed: s.collapsed }) },
  ),
);
