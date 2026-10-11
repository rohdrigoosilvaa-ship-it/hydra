import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CompanyFilterState {
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;
}

/**
 * Empresa selecionada no filtro global do header — persistida para que o
 * usuário não precise escolher de novo a cada tela (Dashboard, Minha Empresa,
 * Colaboradores todos leem daqui).
 */
export const useCompanyFilterStore = create<CompanyFilterState>()(
  persist(
    (set) => ({
      selectedCompanyId: null,
      setSelectedCompanyId: (id) => set({ selectedCompanyId: id }),
    }),
    { name: "hydra-company-filter" },
  ),
);
