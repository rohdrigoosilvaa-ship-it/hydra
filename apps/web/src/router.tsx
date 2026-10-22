import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { UsersPage } from "./pages/UsersPage";
import { InicioPage } from "./pages/InicioPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CompanyPage } from "./pages/CompanyPage";
import { BranchesPage } from "./pages/BranchesPage";
import { DepartmentsPage } from "./pages/DepartmentsPage";
import { PositionsPage } from "./pages/PositionsPage";
import { CboSearchPage } from "./pages/CboSearchPage";
import { DocumentExpiryPage } from "./pages/DocumentExpiryPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { EmployeeDetailPage } from "./pages/EmployeeDetailPage";
import { PgrListPage } from "./pages/PgrListPage";
import { PgrDetailPage } from "./pages/PgrDetailPage";
import { ActionsPage } from "./pages/ActionsPage";
import { HealthPage } from "./pages/HealthPage";
import { OccurrencesPage } from "./pages/OccurrencesPage";
import { CipaPage } from "./pages/CipaPage";
import { CipaElectionsPage } from "./pages/CipaElectionsPage";
import { CipaElectionDetailPage } from "./pages/CipaElectionDetailPage";
import { LtcatPage } from "./pages/LtcatPage";
import { LtcatDetailPage } from "./pages/LtcatDetailPage";
import { ReportsPage } from "./pages/ReportsPage";
import { PrevidenciarioPage } from "./pages/PrevidenciarioPage";
import { PppPage } from "./pages/PppPage";
import { EsocialPage } from "./pages/EsocialPage";
import { HydraNetPage } from "./pages/HydraNetPage";
import { FinancePage } from "./pages/FinancePage";
import { CrmPage } from "./pages/CrmPage";
import { MedicalBillingPage } from "./pages/MedicalBillingPage";
import { ContractsHubPage } from "./pages/ContractsHubPage";
import { PsychosocialListPage } from "./pages/PsychosocialListPage";
import { PsychosocialDetailPage } from "./pages/PsychosocialDetailPage";
import { PsychosocialResponsePage } from "./pages/PsychosocialResponsePage";
import { ContractSigningPage } from "./pages/ContractSigningPage";
import { EpiStockPage } from "./pages/EpiStockPage";
import { EpiControlPage } from "./pages/EpiControlPage";
import { EpiDeliveryDetailPage } from "./pages/EpiDeliveryDetailPage";
import { EpiSigningPage } from "./pages/EpiSigningPage";
import { WorkOrdersPage } from "./pages/WorkOrdersPage";
import { WorkOrderDetailPage } from "./pages/WorkOrderDetailPage";
import { WorkOrderSigningPage } from "./pages/WorkOrderSigningPage";
import { Nr01OverviewPage } from "./pages/Nr01OverviewPage";
import { Nr01GroPage } from "./pages/Nr01GroPage";
import { Nr01InventoryPage } from "./pages/Nr01InventoryPage";
import { Nr01GhePage } from "./pages/Nr01GhePage";
import { Nr01ReevaluationsPage } from "./pages/Nr01ReevaluationsPage";
import { PendenciasPage } from "./pages/PendenciasPage";
import { InspectionsHubPage } from "./pages/InspectionsHubPage";
import { ComingSoonPage } from "./pages/ComingSoonPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/esqueci-minha-senha", element: <ForgotPasswordPage /> },
  { path: "/redefinir-senha", element: <ResetPasswordPage /> },
  { path: "/pesquisa/:token", element: <PsychosocialResponsePage /> },
  { path: "/assinar/:token", element: <ContractSigningPage /> },
  { path: "/epi/assinar/:token", element: <EpiSigningPage /> },
  { path: "/ordens-servico/assinar/:token", element: <WorkOrderSigningPage /> },
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <InicioPage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "minha-empresa", element: <CompanyPage /> },

      { path: "cadastros/estrutura/unidades", element: <BranchesPage /> },
      { path: "cadastros/estrutura/setores", element: <DepartmentsPage /> },
      { path: "cadastros/estrutura/cargos", element: <PositionsPage /> },
      { path: "cadastros/estrutura/funcionarios", element: <EmployeesPage /> },
      { path: "cadastros/estrutura/funcionarios/:id", element: <EmployeeDetailPage /> },
      { path: "cadastros/estrutura/cbo", element: <CboSearchPage /> },

      { path: "controle-vencimentos", element: <DocumentExpiryPage /> },
      { path: "usuarios", element: <UsersPage /> },
      { path: "pendencias", element: <PendenciasPage /> },

      { path: "pgr", element: <PgrListPage /> },
      { path: "pgr/:id", element: <PgrDetailPage /> },
      { path: "acoes", element: <ActionsPage /> },
      { path: "saude", element: <HealthPage /> },
      { path: "incidentes", element: <OccurrencesPage /> },
      { path: "cipa", element: <CipaPage /> },
      { path: "cipa/eleicoes", element: <CipaElectionsPage /> },
      { path: "cipa/eleicoes/:id", element: <CipaElectionDetailPage /> },
      { path: "ltcat", element: <LtcatPage /> },
      { path: "ltcat/:id", element: <LtcatDetailPage /> },
      { path: "laudos", element: <ReportsPage /> },
      { path: "previdenciario", element: <PrevidenciarioPage /> },
      { path: "ppp", element: <PppPage /> },
      { path: "esocial", element: <EsocialPage /> },
      {
        path: "esocial/auditoria",
        element: (
          <ComingSoonPage
            title="Auditoria eSocial"
            description="Comparativo entre o que está cadastrado no ProtecOne e o que foi efetivamente enviado ao eSocial."
          />
        ),
      },
      { path: "hydranet", element: <HydraNetPage /> },
      {
        path: "integracoes/sincronizacoes",
        element: (
          <ComingSoonPage
            title="Sincronizações"
            description="Histórico e status das sincronizações de dados entre o ProtecOne e sistemas integrados."
          />
        ),
      },
      {
        path: "integracoes/apis",
        element: (
          <ComingSoonPage
            title="APIs"
            description="Gestão de chaves e endpoints de integração externa com o ProtecOne."
          />
        ),
      },
      { path: "financeiro", element: <FinancePage /> },
      { path: "crm", element: <CrmPage /> },
      { path: "contas-medicas", element: <MedicalBillingPage /> },
      { path: "contratos", element: <ContractsHubPage /> },
      { path: "checkhub/dashboard", element: <InspectionsHubPage view="dashboard" /> },
      { path: "checkhub/criar-checklist", element: <InspectionsHubPage view="criar-checklist" /> },
      { path: "checkhub/checklists-aplicados", element: <InspectionsHubPage view="checklists-aplicados" /> },
      { path: "checkhub/planos-de-acao", element: <InspectionsHubPage view="planos-de-acao" /> },
      // endereço antigo: mantém links e favoritos funcionando
      { path: "inspecoes", element: <Navigate to="/checkhub/dashboard" replace /> },
      { path: "epi", element: <EpiControlPage /> },
      { path: "controle-epi", element: <EpiStockPage /> },
      { path: "epi/:id", element: <EpiDeliveryDetailPage /> },
      { path: "ordens-servico", element: <WorkOrdersPage /> },
      { path: "ordens-servico/:id", element: <WorkOrderDetailPage /> },
      {
        path: "treinamentos",
        element: (
          <ComingSoonPage
            title="Treinamentos"
            description="Cadastro de treinamentos obrigatórios, vínculo com cargos e controle de vencimento."
          />
        ),
      },
      {
        path: "absenteismo",
        element: (
          <ComingSoonPage
            title="Absenteísmo"
            description="Indicadores de ausências, afastamentos e faltas por unidade e período."
          />
        ),
      },
      {
        path: "auditorias",
        element: (
          <ComingSoonPage
            title="Auditorias"
            description="Planejamento e registro de auditorias internas e externas de segurança e saúde ocupacional."
          />
        ),
      },
      {
        path: "compliance",
        element: (
          <ComingSoonPage
            title="Compliance"
            description="Painel de conformidade normativa consolidando exigências legais e seu status de atendimento."
          />
        ),
      },
      {
        path: "perfis-permissoes",
        element: (
          <ComingSoonPage
            title="Perfis e Permissões"
            description="Gestão de papéis de acesso e permissões granulares por módulo."
          />
        ),
      },
      {
        path: "logs-auditoria",
        element: (
          <ComingSoonPage
            title="Logs e Auditoria"
            description="Trilha de alterações do sistema, com visão de antes/depois por registro."
          />
        ),
      },
      { path: "nr01", element: <Nr01OverviewPage /> },
      { path: "nr01/gro", element: <Nr01GroPage /> },
      { path: "nr01/inventario", element: <Nr01InventoryPage /> },
      { path: "nr01/ghe", element: <Nr01GhePage /> },
      { path: "nr01/psicossocial", element: <PsychosocialListPage /> },
      { path: "nr01/psicossocial/:id", element: <PsychosocialDetailPage /> },
      {
        path: "nr01/avaliacoes",
        element: (
          <ComingSoonPage
            title="Avaliações"
            description="Central de avaliações do Módulo NR-01, reunindo pesquisas psicossociais e outras avaliações de risco."
          />
        ),
      },
      { path: "nr01/reavaliacoes", element: <Nr01ReevaluationsPage /> },
      {
        path: "nr01/indicadores",
        element: (
          <ComingSoonPage
            title="Indicadores"
            description="Participação, riscos, ações, eficácia e evolução por período em um único painel."
          />
        ),
      },
      {
        path: "nr01/relatorios",
        element: (
          <ComingSoonPage
            title="Relatórios"
            description="Geração de relatório completo do GRO — identificação, metodologia, resultados, riscos, plano de ação e conclusão."
          />
        ),
      },
      {
        path: "nr01/evidencias",
        element: (
          <ComingSoonPage
            title="Evidências"
            description="Entrevistas, observações, documentos e indicadores organizacionais vinculados aos riscos identificados."
          />
        ),
      },
      {
        path: "nr01/configuracoes",
        element: (
          <ComingSoonPage
            title="Configurações NR-01"
            description="Metodologias, matriz de risco, níveis, anonimato, periodicidade e permissões do módulo."
          />
        ),
      },
      {
        path: "configuracoes",
        element: (
          <ComingSoonPage
            title="Configurações"
            description="Preferências gerais do sistema, tema, notificações e integrações."
          />
        ),
      },
      {
        path: "ajuda",
        element: (
          <ComingSoonPage
            title="Ajuda e Suporte"
            description="Central de ajuda, documentação e contato com o suporte."
          />
        ),
      },
    ],
  },
]);
