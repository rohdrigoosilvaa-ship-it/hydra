import {
  House,
  LayoutDashboard,
  Building2,
  FolderTree,
  Network,
  MapPin,
  UsersRound,
  BriefcaseBusiness,
  UserRound,
  Search,
  Files,
  Users,
  ListTodo,
  CircleGauge,
  TriangleAlert,
  Boxes,
  Brain,
  ClipboardCheck,
  ListChecks,
  RefreshCw,
  ChartNoAxesCombined,
  FileBarChart,
  Paperclip,
  Settings,
  ShieldCheck,
  SearchCheck,
  ClipboardList,
  Siren,
  HardHat,
  PackageCheck,
  FileCheck2,
  GraduationCap,
  FileText,
  HeartPulse,
  Scale,
  FileBadge,
  Link as LinkIcon,
  ShieldQuestion,
  Gavel,
  Vote,
  ScrollText,
  PlugZap,
  Webhook,
  WalletCards,
  Handshake,
  Stethoscope,
  FileSignature,
  KeyRound,
  History,
  CircleHelp,
  type LucideIcon,
} from "lucide-react";
import { hasPermission, PERMISSIONS, type Permission } from "./permissions";
import type { RoleAssignment } from "./auth-store";

export interface NavLinkItem {
  kind: "link";
  to: string;
  label: string;
  icon: LucideIcon;
  permission?: Permission;
  end?: boolean;
}

export interface NavGroupItem {
  kind: "group";
  id: string;
  label: string;
  icon: LucideIcon;
  children: NavNode[];
}

/** Item não-navegável com comportamento próprio (ex.: "Atualizar dados") — o
 * Sidebar trata `kind: "action"` com um handler dedicado, não uma rota. */
export interface NavActionItem {
  kind: "action";
  id: string;
  label: string;
  icon: LucideIcon;
  permission?: Permission;
}

export type NavNode = NavLinkItem | NavGroupItem | NavActionItem;

/** Link para um sistema externo (abre em outra aba), mostrado como item solto no menu. */
export interface NavExternalLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavNode[];
  /** Quando presente, a seção é só este link externo (sem cabeçalho nem itens). */
  external?: NavExternalLink;
}

export const topItems: NavLinkItem[] = [
  { kind: "link", to: "/", label: "Início", icon: House, end: true },
  { kind: "link", to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export const navSections: NavSection[] = [
  {
    id: "gestao",
    label: "Gestão",
    items: [
      { kind: "link", to: "/minha-empresa", label: "Minha Empresa", icon: Building2, permission: PERMISSIONS.ORG_COMPANY_READ },
      {
        kind: "group",
        id: "cadastros",
        label: "Cadastros",
        icon: FolderTree,
        children: [
          {
            kind: "group",
            id: "estrutura",
            label: "Estrutura",
            icon: Network,
            children: [
              { kind: "link", to: "/cadastros/estrutura/unidades", label: "Unidade", icon: MapPin, permission: PERMISSIONS.ORG_BRANCH_READ },
              { kind: "link", to: "/cadastros/estrutura/setores", label: "Setor", icon: UsersRound, permission: PERMISSIONS.ORG_DEPARTMENT_READ },
              { kind: "link", to: "/cadastros/estrutura/cargos", label: "Cargo", icon: BriefcaseBusiness, permission: PERMISSIONS.ORG_POSITION_READ },
              { kind: "link", to: "/cadastros/estrutura/funcionarios", label: "Funcionário", icon: UserRound, permission: PERMISSIONS.ORG_EMPLOYEE_READ },
              { kind: "link", to: "/cadastros/estrutura/cbo", label: "Consultar CBO", icon: Search },
            ],
          },
        ],
      },
      { kind: "link", to: "/controle-vencimentos", label: "Controle de Vencimentos de Documentos", icon: Files, permission: PERMISSIONS.EMPLOYEE_DOCUMENT_READ },
      { kind: "link", to: "/usuarios", label: "Usuários", icon: Users, permission: PERMISSIONS.ORG_USER_MANAGE },
      { kind: "link", to: "/pendencias", label: "Central de Pendências", icon: ListTodo, permission: PERMISSIONS.PGR_READ },
    ],
  },
  {
    id: "seguranca",
    label: "Segurança do Trabalho",
    items: [
      { kind: "link", to: "/pgr", label: "PGR", icon: ShieldCheck, permission: PERMISSIONS.PGR_READ },
      { kind: "link", to: "/nr01/ghe", label: "GHE", icon: Boxes, permission: PERMISSIONS.PGR_READ },
      { kind: "link", to: "/nr01/inventario", label: "Inventário de Riscos", icon: TriangleAlert, permission: PERMISSIONS.PGR_READ },
      { kind: "link", to: "/nr01/gro", label: "GRO", icon: SearchCheck, permission: PERMISSIONS.PGR_READ },
      { kind: "link", to: "/incidentes", label: "Incidentes", icon: Siren, permission: PERMISSIONS.OCCURRENCE_READ },
      {
        kind: "group",
        id: "cipa",
        label: "CIPA",
        icon: Users,
        children: [
          { kind: "link", to: "/cipa", label: "Mandatos", icon: Users, permission: PERMISSIONS.CIPA_READ },
          { kind: "link", to: "/cipa/eleicoes", label: "Processo Eleitoral", icon: Vote, permission: PERMISSIONS.CIPA_READ },
        ],
      },
      { kind: "link", to: "/epi", label: "EPI", icon: HardHat, permission: PERMISSIONS.EPI_READ },
      { kind: "link", to: "/controle-epi", label: "Controle de EPI", icon: PackageCheck, permission: PERMISSIONS.EPI_READ },
      { kind: "link", to: "/ordens-servico", label: "Ordem de Serviço", icon: FileCheck2, permission: PERMISSIONS.WORK_ORDER_READ },
      { kind: "link", to: "/treinamentos", label: "Treinamentos", icon: GraduationCap, permission: PERMISSIONS.EMPLOYEE_DOCUMENT_READ },
      { kind: "link", to: "/ltcat", label: "LTCAT", icon: ClipboardList, permission: PERMISSIONS.LTCAT_READ },
      { kind: "link", to: "/laudos", label: "Laudos", icon: FileText, permission: PERMISSIONS.REPORT_READ },
    ],
  },
  {
    id: "saude",
    label: "Saúde Ocupacional",
    items: [
      { kind: "link", to: "/saude", label: "Saúde Ocupacional", icon: HeartPulse, permission: PERMISSIONS.HEALTH_READ },
      { kind: "link", to: "/previdenciario", label: "Afastamentos", icon: Scale, permission: PERMISSIONS.PREV_READ },
      { kind: "link", to: "/absenteismo", label: "Absenteísmo", icon: ChartNoAxesCombined, permission: PERMISSIONS.PREV_READ },
    ],
  },
  {
    id: "conformidade",
    label: "Conformidade",
    items: [
      { kind: "link", to: "/previdenciario", label: "Previdenciário", icon: Scale, permission: PERMISSIONS.PREV_READ },
      { kind: "link", to: "/ppp", label: "PPP", icon: FileBadge, permission: PERMISSIONS.PPP_READ },
      { kind: "link", to: "/esocial", label: "eSocial", icon: LinkIcon, permission: PERMISSIONS.ESOCIAL_READ },
      { kind: "link", to: "/esocial/auditoria", label: "Auditoria eSocial", icon: ShieldQuestion, permission: PERMISSIONS.ESOCIAL_READ },
    ],
  },
  {
    id: "gestao-controle",
    label: "Gestão e Controle",
    items: [
      { kind: "link", to: "/auditorias", label: "Auditorias", icon: Gavel, permission: PERMISSIONS.PGR_READ },
      { kind: "link", to: "/compliance", label: "Compliance", icon: ScrollText, permission: PERMISSIONS.PGR_READ },
    ],
  },
  {
    id: "integracoes",
    label: "Integrações",
    items: [
      { kind: "link", to: "/hydranet", label: "HydraNET", icon: PlugZap, permission: PERMISSIONS.PROVIDER_READ },
      { kind: "link", to: "/integracoes/sincronizacoes", label: "Sincronizações", icon: RefreshCw, permission: PERMISSIONS.PROVIDER_READ },
      { kind: "link", to: "/integracoes/apis", label: "APIs", icon: Webhook, permission: PERMISSIONS.PROVIDER_READ },
      { kind: "action", id: "atualizar-dados", label: "Atualizar dados", icon: RefreshCw },
    ],
  },
  {
    id: "administrativo",
    label: "Administrativo",
    items: [
      { kind: "link", to: "/financeiro", label: "Financeiro", icon: WalletCards, permission: PERMISSIONS.FINANCE_READ },
      { kind: "link", to: "/crm", label: "CRM", icon: Handshake, permission: PERMISSIONS.CRM_READ },
      { kind: "link", to: "/contas-medicas", label: "Contas Médicas", icon: Stethoscope, permission: PERMISSIONS.MEDICAL_BILL_READ },
      { kind: "link", to: "/contratos", label: "Contratos", icon: FileSignature, permission: PERMISSIONS.CONTRACT_READ },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    items: [
      { kind: "link", to: "/configuracoes", label: "Configurações", icon: Settings },
      { kind: "link", to: "/perfis-permissoes", label: "Perfis e Permissões", icon: KeyRound, permission: PERMISSIONS.ORG_USER_MANAGE },
      { kind: "link", to: "/logs-auditoria", label: "Logs e Auditoria", icon: History, permission: PERMISSIONS.ORG_USER_MANAGE },
      { kind: "link", to: "/ajuda", label: "Ajuda e Suporte", icon: CircleHelp },
    ],
  },
  {
    id: "avalia-nr01",
    label: "Avalia NR-01",
    items: [],
    external: { href: "https://avalia-nr-01.vercel.app/#/painel", label: "Avalia NR-01", icon: CircleGauge },
  },
  {
    id: "protechub",
    label: "ProtecHub",
    items: [],
    external: { href: "https://protecseg-academy.vercel.app/login", label: "ProtecHub", icon: GraduationCap },
  },
  {
    id: "checkhub",
    label: "CheckHub",
    items: [],
    external: { href: "https://checkhub-protecseg.vercel.app/", label: "CheckHub", icon: ClipboardCheck },
  },
];

function nodeVisible(node: NavNode, assignments: RoleAssignment[]): boolean {
  if (node.kind === "group") return node.children.some((c) => nodeVisible(c, assignments));
  return !node.permission || hasPermission(assignments, node.permission);
}

function filterNode(node: NavNode, assignments: RoleAssignment[]): NavNode | null {
  if (node.kind === "group") {
    const children = node.children.map((c) => filterNode(c, assignments)).filter((c): c is NavNode => c !== null);
    return children.length > 0 ? { ...node, children } : null;
  }
  return !node.permission || hasPermission(assignments, node.permission) ? node : null;
}

/** Filtra a árvore de navegação pelas permissões do usuário — grupos vazios somem inteiros. */
export function filterSections(assignments: RoleAssignment[]): NavSection[] {
  return navSections
    .map((section) => ({ ...section, items: section.items.map((i) => filterNode(i, assignments)).filter((i): i is NavNode => i !== null) }))
    .filter((section) => section.items.length > 0 || section.external);
}

export function filterTopItems(assignments: RoleAssignment[]): NavLinkItem[] {
  return topItems.filter((i) => nodeVisible(i, assignments));
}

/** true se o nó (ou algum descendente) corresponde à rota atual — usado para auto-expandir accordions. */
export function nodeMatchesPath(node: NavNode, pathname: string): boolean {
  if (node.kind === "action") return false;
  if (node.kind === "link") {
    return node.end ? pathname === node.to : pathname === node.to || pathname.startsWith(`${node.to}/`);
  }
  return node.children.some((c) => nodeMatchesPath(c, pathname));
}

export interface Breadcrumb {
  section: string | null;
  trail: string[];
  label: string;
}

/** Resolve "Seção / Grupo / Item" para o breadcrumb do topbar a partir da rota atual. */
export function resolveBreadcrumb(pathname: string): Breadcrumb {
  for (const item of topItems) {
    if (nodeMatchesPath(item, pathname)) return { section: null, trail: [], label: item.label };
  }
  for (const section of navSections) {
    const trail: string[] = [];
    const found = findInNodes(section.items, pathname, trail);
    if (found) return { section: section.label, trail, label: found };
  }
  return { section: null, trail: [], label: "ProtecOne" };
}

function findInNodes(nodes: NavNode[], pathname: string, trail: string[]): string | null {
  for (const node of nodes) {
    if (node.kind === "link" && nodeMatchesPath(node, pathname)) return node.label;
    if (node.kind === "group" && nodeMatchesPath(node, pathname)) {
      trail.push(node.label);
      const inner = findInNodes(node.children, pathname, trail);
      if (inner) return inner;
      trail.pop();
    }
  }
  return null;
}
