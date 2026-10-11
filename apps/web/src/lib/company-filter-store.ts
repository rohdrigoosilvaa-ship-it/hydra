import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CompanyFilterState {
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;
  /** Incrementa quando empresas são criadas/editadas/excluídas, para o seletor do header recarregar. */
  companiesVersion: number;
  refreshCompanies: () => void;
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
      companiesVersion: 0,
      refreshCompanies: () => set((s) => ({ companiesVersion: s.companiesVersion + 1 })),
    }),
    {
      name: "hydra-company-filter",
      partialize: (s) => ({ selectedCompanyId: s.selectedCompanyId }),
    },
  ),
);
