// Controle de acesso por empresa — usuários

export type HydraRole =
  | "SUPER_ADMIN"
  | "ADMIN_EMPRESA"
  | "GESTOR_SST"
  | "ENGENHEIRO"
  | "TECNICO_SST"
  | "MEDICO"
  | "ENFERMEIRO"
  | "RH"
  | "GESTOR"
  | "COLABORADOR"
  | "PRESTADOR"
  | "CLINICA"
  | "FINANCEIRO"
  | "COMERCIAL";

export const HYDRA_ROLE_LABELS: Record<HydraRole, string> = {
  SUPER_ADMIN: "Administrador (todas as empresas)",
  ADMIN_EMPRESA: "Administrador da empresa",
  GESTOR_SST: "Gestor de SST",
  ENGENHEIRO: "Engenheiro de Segurança",
  TECNICO_SST: "Técnico de SST",
  MEDICO: "Médico do Trabalho",
  ENFERMEIRO: "Enfermeiro do Trabalho",
  RH: "Recursos Humanos",
  GESTOR: "Gestor de área",
  COLABORADOR: "Colaborador",
  PRESTADOR: "Prestador de serviço",
  CLINICA: "Clínica parceira",
  FINANCEIRO: "Financeiro",
  COMERCIAL: "Comercial",
};

export interface HydraUserRoleAssignment {
  id: string;
  role: HydraRole;
  scopeType: "TENANT" | "COMPANY" | "BRANCH" | "UNIT";
  scopeId: string | null;
}

export interface HydraUser {
  id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  lastLoginAt: string | null;
  createdAt: string;
  roleAssignments: HydraUserRoleAssignment[];
}

// Ajustes — filtro de empresa global

export interface CompanySummary {
  id: string;
  name: string;
  employeeCount: number;
  lateActionsCount: number;
  monthIncidentsCount: number;
}

// Fase 4 — Financeiro, CRM, Contas Médicas

export type InvoiceStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELED";

export interface Invoice {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
}

export type CrmStage = "LEAD" | "CONTATO" | "QUALIFICACAO" | "PROPOSTA" | "NEGOCIACAO" | "CONTRATO" | "CLIENTE";

export interface CrmTask {
  id: string;
  leadId: string;
  description: string;
  done: boolean;
}

export interface CrmLead {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  stage: CrmStage;
  tasks: CrmTask[];
}

export type MedicalBillStatus = "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "GLOSSED" | "PAID";

export interface MedicalBill {
  id: string;
  providerId: string;
  referenceMonth: string;
  totalAmount: number;
  glossAmount: number | null;
  status: MedicalBillStatus;
  provider?: Provider;
}

// Fase 3 — Previdenciário, PPP, eSocial, HydraNET

export type AbsenceType = "DOENCA" | "MATERNIDADE" | "ACIDENTE" | "OUTROS";

export interface Absence {
  id: string;
  employeeId: string;
  type: AbsenceType;
  startDate: string;
  endDate: string | null;
  inssBenefit: string | null;
}

export interface FapRecord {
  id: string;
  companyId: string;
  year: number;
  fapIndex: number;
  ntepCount: number;
}

export interface Ppp {
  id: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string | null;
  status: string;
}

export type EsocialEventType = "S2210" | "S2220" | "S2221" | "S2230" | "S2240";
export type EsocialEventStatus = "PENDING" | "SENT" | "PROCESSED" | "REJECTED";

export interface EsocialEvent {
  id: string;
  eventType: EsocialEventType;
  status: EsocialEventStatus;
  receiptNumber: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export type ProviderType = "CLINICA" | "ENGENHEIRO" | "TECNICO" | "CONSULTORIA" | "LABORATORIO" | "OUTRO";

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  email: string | null;
  phone: string | null;
  contracts: ProviderContract[];
}

export interface ProviderContract {
  id: string;
  providerId: string;
  status: "DRAFT" | "ACTIVE" | "EXPIRED" | "CANCELED";
  startDate: string;
  endDate: string | null;
  provider?: Provider;
}

// Fase 2 — Saúde, ocorrências, CIPA, LTCAT, laudos

export type ExamType = "ADMISSIONAL" | "PERIODICO" | "DEMISSIONAL" | "RETORNO_TRABALHO" | "MUDANCA_RISCO";
export type ExamResult = "APTO" | "INAPTO" | "PENDENTE";
export type DocumentStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "ARCHIVED";

export interface Pcmso {
  id: string;
  title: string;
  status: DocumentStatus;
  version: number;
  companyId?: string;
}

export interface MedicalExam {
  id: string;
  employeeId: string;
  type: ExamType;
  performedAt: string | null;
  scheduledAt?: string | null;
  nextDueAt?: string | null;
  result: ExamResult;
  aso: { id: string; result: ExamResult } | null;
}

export type OccurrenceType = "INCIDENT" | "NEAR_MISS" | "ACCIDENT_TYPICAL" | "ACCIDENT_COMMUTE" | "OCCUPATIONAL_DISEASE";
export type OccurrenceStatus = "OPEN" | "INVESTIGATING" | "CLOSED";
export type OccurrenceInvolvedPersonRole = "VITIMA" | "TESTEMUNHA" | "ENVOLVIDO";

export interface OccurrenceInvolvedPerson {
  id: string;
  occurrenceId: string;
  employeeId: string | null;
  name: string | null;
  role: OccurrenceInvolvedPersonRole;
}

export interface Occurrence {
  id: string;
  companyId: string;
  type: OccurrenceType;
  highPotential: boolean;
  description: string;
  location: string | null;
  immediateActions: string | null;
  occurredAt: string;
  status: OccurrenceStatus;
  investigation: { id: string } | null;
  cat: { id: string; status: string } | null;
  involvedPeople: OccurrenceInvolvedPerson[];
}

export type BehaviorObservationCategory = "ATO_SEGURO" | "ATO_INSEGURO" | "CONDICAO_SEGURA" | "CONDICAO_INSEGURA";

export interface BehaviorObservation {
  id: string;
  companyId: string;
  branchId: string | null;
  observerId: string | null;
  observedEmployeeId: string | null;
  category: BehaviorObservationCategory;
  description: string;
  actionTaken: string | null;
  createdAt: string;
}

export interface CipaMember {
  id: string;
  employeeId: string;
  role: "TITULAR" | "SUPLENTE";
  representation: "EMPREGADOR" | "EMPREGADOS";
}

export interface CipaTerm {
  id: string;
  startDate: string;
  endDate: string;
  status: "PLANNED" | "ACTIVE" | "CLOSED";
  members: CipaMember[];
}

export type CipaElectionType = "PRIMEIRA" | "RENOVACAO";
export type CipaScheduleOrigin = "LEGAL" | "PROGRAMADA";

export interface CipaElectionScheduleStep {
  id: string;
  etapa: string;
  regra: string;
  origem: CipaScheduleOrigin;
  baseLegal: string | null;
  diasRelativos: number;
  data: string;
  concluido: boolean;
  order: number;
}

export interface CipaElection {
  id: string;
  companyId: string;
  branchId: string | null;
  type: CipaElectionType;
  grauRisco: number;
  gestaoLabel: string;
  posseDate: string;
  dataTerminoMandatoAtual: string | null;
  createdAt: string;
}

export interface CipaDimensionamento {
  faixaLabel: string;
  titularesEmpregados: number;
  suplentesEmpregados: number;
  titularesOrganizacao: number;
  suplentesOrganizacao: number;
  totalMembros: number;
  semObrigatoriedade: boolean;
}

export interface CipaElectionDetail extends CipaElection {
  steps: CipaElectionScheduleStep[];
  empregados: number;
  dimensionamento: CipaDimensionamento | null;
}

export interface Ltcat {
  id: string;
  companyId: string;
  branchId: string | null;
  title: string;
  code: string | null;
  status: DocumentStatus;
  version: number;
  artNumber: string | null;
  issuedAt: string | null;
  validFrom: string | null;
  validUntil: string | null;
  preparedBy: string | null;
  reviewedBy: string | null;
  approvedBy: string | null;
  companyResponsibleName: string | null;
  companyResponsibleRole: string | null;
  technicalResponsibleName: string | null;
  technicalResponsibleSpecialty: string | null;
  technicalResponsibleRegistry: string | null;
  technicalResponsibleCouncil: string | null;
  technicalResponsibleUf: string | null;
  updatedAt: string;
  _count?: { agents: number };
}

export interface LtcatAgent {
  id: string;
  ltcatId: string;
  gheId: string | null;
  agentCategory: RiskCategory;
  agentName: string;
  intensityConcentration: string | null;
  toleranceLimit: string | null;
  measurementMethod: string | null;
  exposureTechnique: string | null;
  effectiveEpi: string | null;
  conclusion: string | null;
  ghe?: Ghe | null;
}

export interface LtcatDetail extends Ltcat {
  ghes: Ghe[];
  agents: LtcatAgent[];
}

export type TechnicalReportType = "INSALUBRIDADE" | "PERICULOSIDADE" | "COMPLEMENTAR" | "PARECER" | "ERGONOMICO";

export interface TechnicalReport {
  id: string;
  type: TechnicalReportType;
  title: string;
  status: DocumentStatus;
}

export interface Company {
  id: string;
  contractedLives?: number | null;
  /** Só vem em `/companies?withCounts=true`. */
  counts?: { employees: number; positions: number; ghes: number; pendingActions: number; priorityRisks: number };
  /** PGR mais recente da empresa (só vem em `/companies?withCounts=true`). */
  pgr?: { id: string; title: string; status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "ARCHIVED"; updatedAt: string } | null;
  name: string;
  legalName: string | null;
  cnpj: string | null;
  logoUrl: string | null;

  // Identificação
  unidadeContratante: boolean;
  cpf: string | null;
  cei: string | null;
  caepf: string | null;
  cno: string | null;
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  telefone: string | null;
  codigoRH: string | null;

  // CNAE e risco
  cnae: string | null;
  cnaeSecundario: string | null;
  grauRisco: number | null;
  caracterizacaoProcessos: string | null;
  descricaoLocal: string | null;
  desconsiderarEsocial: boolean;

  // Endereço
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;

  // Endereço de cobrança
  cepCobranca: string | null;
  enderecoCobranca: string | null;
  numeroCobranca: string | null;
  complementoCobranca: string | null;
  bairroCobranca: string | null;
  cidadeCobranca: string | null;
  estadoCobranca: string | null;

  // Contrato / PPP / ASO / Brigada
  dataContrato: string | null;
  observacaoPPP: string | null;
  observacaoASO: string | null;
  percentualBrigada: number | null;

  // Log (só presente quando vem de GET /companies/:id)
  createdAt?: string;
  updatedAt?: string;
  createdByName?: string | null;
  updatedByName?: string | null;
}

export type RecordStatus = "ACTIVE" | "INACTIVE";

export interface Branch {
  id: string;
  companyId: string;
  code: string | null;
  name: string;
  cnpj: string | null;
  cep: string | null;
  address: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  city: string | null;
  state: string | null;
  status: RecordStatus;
}

export interface Unit {
  id: string;
  branchId: string;
  name: string;
}

export type RiskCategory = "FISICO" | "QUIMICO" | "BIOLOGICO" | "ERGONOMICO" | "ACIDENTE";
export type RiskLevel = "IRRELEVANT" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type PgrStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "ARCHIVED";
export type ActionStatus = "OPEN" | "IN_PROGRESS" | "LATE" | "VALIDATING" | "DONE" | "CANCELED";
export type ExposureType = "HABITUAL" | "EVENTUAL" | "INTERMITENTE" | "PERMANENTE";
export type EvaluationCriteria = "QUALITATIVO" | "QUANTITATIVO";

export interface Hazard {
  id: string;
  category: RiskCategory;
  name: string;
  description: string | null;
  damagePotential: string | null;
  esocialCode: string | null;
  sourceCircumstances?: string | null;
  observations?: string | null;
  adminMeasures?: string | null;
  exposureType?: ExposureType | null;
  sendEsocial?: boolean;
  measurementType?: "QUALITATIVO" | "QUANTITATIVO";
  generatesUnhealthiness?: boolean;
  generatesHazardPay?: boolean;
  specialRetirement?: boolean;
  insertInAso?: boolean;
  epcStatus?: string;
  epiStatus?: string;
  protections?: { equipment: ProtectionEquipment }[];
}

export interface ProtectionEquipment {
  id: string;
  kind: "EPC" | "EPI";
  name: string;
  usefulLifeMonths?: number | null;
  description?: string;
  category?: { id: string; name: string } | null;
}

export interface Pgr {
  id: string;
  title: string;
  code: string | null;
  status: PgrStatus;
  version: number;
  companyId: string;
  branchId: string | null;
  issuedAt: string | null;
  validFrom: string | null;
  validUntil: string | null;
  preparedBy: string | null;
  reviewedBy: string | null;
  approvedBy: string | null;
  companyResponsibleName: string | null;
  companyResponsibleRole: string | null;
  technicalResponsibleName: string | null;
  technicalResponsibleSpecialty: string | null;
  technicalResponsibleRegistry: string | null;
  technicalResponsibleCouncil: string | null;
  technicalResponsibleUf: string | null;
  cnae: string | null;
  grauRisco: number | null;
  employeeCount: number | null;
  procedimentoTrabalho: string | null;
  treinamentosNecessarios: string | null;
  episRecomendados: string | null;
  metasPrioridades: string | null;
  consideracoesFinais: string | null;
  modelHtml?: string | null;
  coordinator?: string | null;
  description?: string | null;
  renewalAt?: string | null;
  scheduleIds?: string[];
  updatedAt: string;
  _count?: { risks: number; actions: number };
}

export interface PgrCronogramaMark {
  id: string;
  itemId: string;
  year: number;
  month: number;
}

export interface PgrCronogramaItem {
  id: string;
  pgrId: string;
  description: string;
  responsible: string | null;
  order: number;
  marks: PgrCronogramaMark[];
}

export interface PgrDetail extends Pgr {
  ghes: Ghe[];
  risks: PgrRisk[];
  actions: PgrAction[];
  cronograma: PgrCronogramaItem[];
  progressPercent: number;
}

export interface GheFunction {
  id: string;
  gheId: string;
  departmentId: string | null;
  positionId: string | null;
  activityDescription: string | null;
  department: Department | null;
  position: Position | null;
}

export interface Ghe {
  id: string;
  pgrId: string | null;
  ltcatId: string | null;
  name: string;
  code: string | null;
  localDescription: string | null;
  activityDescription: string | null;
  functions: GheFunction[];
  employeesCount?: number;
}

export type YesNo = "SIM" | "NAO" | "NAO_SE_APLICA";

export interface PgrRisk {
  id: string;
  pgrId: string;
  gheId: string;
  hazardId: string;
  description: string | null;
  legalBasis: string | null;
  exposureTime: string | null;
  usesEpc: YesNo | null;
  epcEffective: YesNo | null;
  usesEpi: YesNo | null;
  epiEffective: YesNo | null;
  requiredActions: string | null;
  guidance: string | null;
  typicalInjuries: string | null;
  sourceCircumstances: string | null;
  propagationMeans: string | null;
  exposureType: ExposureType | null;
  evaluationCriteria: EvaluationCriteria | null;
  exposureProfile: string | null;
  probability: number;
  severity: number;
  riskLevel: RiskLevel;
  classification: string | null;
  conclusion: string | null;
  adminControls: string | null;
  engineeringControls: string | null;
  epcMeasures: string | null;
  epiMeasures: string | null;
  hazard: Hazard;
  ghe: Ghe;
}

export interface PgrAction {
  id: string;
  description: string;
  status: ActionStatus;
  dueDate: string | null;
  priority: number;
  pgr?: { id: string; title: string } | null;
  nonConformity?: { id: string; description: string } | null;
}

export interface Department {
  id: string;
  companyId: string;
  branchId: string | null;
  code: string | null;
  name: string;
  status: RecordStatus;
  branch?: { id: string; name: string } | null;
}

export interface PositionRisk {
  hazardId: string;
  exposureType: ExposureType | null;
  sendEsocial: boolean;
  description: string | null;
  damagePotential: string | null;
  observations: string | null;
  sourceCircumstances: string | null;
  adminMeasures: string | null;
  measurementType: "QUALITATIVO" | "QUANTITATIVO";
  generatesUnhealthiness: boolean;
  generatesHazardPay: boolean;
  specialRetirement: boolean;
  insertInAso: boolean;
  epcStatus: string;
  epiStatus: string;
  probability: number | null;
  severity: number | null;
  certainty: number | null;
  hazard: { name: string; category: RiskCategory };
  protection: { equipmentId: string; equipment: { id: string; kind: "EPC" | "EPI"; name: string } }[];
}

export interface Position {
  id: string;
  companyId: string;
  code: string | null;
  name: string;
  cbo: string | null;
  description: string | null;
  status: RecordStatus;
  color?: string | null;
  icon?: string | null;
  esocialStartDate?: string | null;
  requiresEntryAptitude?: boolean;
  sectorInfo?: string | null;
  workSchedule?: string | null;
  additionalInfo?: string | null;
  technicalOpinion?: string | null;
  safetyRecommendations?: string | null;
  gfipCode?: string | null;
  ergonomicMethodology?: string | null;
  generalNotes?: string | null;
  ltcatOpinionNotes?: string | null;
  ltcatOpinionConclusion?: string | null;
  hazardPayOpinionNotes?: string | null;
  hazardPayOpinionConclusion?: string | null;
  unhealthinessOpinionNotes?: string | null;
  unhealthinessOpinionConclusion?: string | null;
  complementaryInfoEnabled?: boolean;
  technicalOpinionEnabled?: boolean;
  /** Ambientes pelos quais o cargo transita. */
  environments?: { environmentId: string }[];
  risks?: PositionRisk[];
  exams?: { id: string; name: string }[];
}

export type EnvironmentUnitType = "MATRIZ" | "FILIAL";

export interface WorkEnvironment {
  id: string;
  companyId: string;
  name: string;
  color: string | null;
  icon: string | null;
  description: string | null;
  location: string | null;
  unitType: EnvironmentUnitType;
  _count?: { positions: number };
}

export interface CompanyPgrProgress {
  id: string;
  title: string;
  status: string;
  percent: number;
  lastDone: string | null;
  next: string | null;
}

export interface CompanySummary {
  esocialEventsRecent: number;
  actions: { open: number; total: number };
  environments: number;
  pgr: CompanyPgrProgress | null;
  asosByMonth: MonthPoint[];
  catsByMonth: MonthPoint[];
  positions: number;
  ghes: number;
  lives: number;
  contractedLives: number | null;
  excessLives: number | null;
  esocialEvents: number;
  asos: number;
  cats: number;
  absentEmployees: number;
  draftDocuments: number;
}

export interface PositionRequiredEpi {
  id: string;
  positionId: string;
  epiCatalogItemId: string | null;
  epiName: string;
  ca: string | null;
  periodicityMonths: number | null;
  notes: string | null;
  catalogItem?: EpiCatalogItem | null;
}

export interface CnaeEntry {
  id: string;
  code: string;
  description: string;
  riskGrade: number;
}

export interface CboOccupation {
  id: string;
  code: string;
  title: string;
  description: string | null;
}

export type EmployeeDocumentType = "RG" | "ASO" | "PPP" | "TREINAMENTO" | "OUTRO";

export interface EmployeeDocument {
  id: string;
  companyId: string;
  employeeId: string;
  type: EmployeeDocumentType;
  name: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  notes: string | null;
  createdAt: string;
  employee?: {
    id: string;
    name: string;
    company: { id: string; name: string };
    branch: { id: string; name: string } | null;
    department: { id: string; name: string } | null;
    position: { id: string; name: string } | null;
  };
}

export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "TERMINATED";

export interface Employee {
  id: string;
  companyId: string;
  branchId: string | null;
  departmentId: string | null;
  positionId: string | null;

  // Dados cadastrais
  name: string;
  leaveReason: string | null;
  birthDate: string | null;
  cpf: string | null;
  registration: string | null;
  admittedAt: string | null;
  inactivatedAt: string | null;
  sex: string | null;
  rg: string | null;
  rgIssueDate: string | null;
  rgIssuer: string | null;
  rgExpiryDate: string | null;
  nit: string | null;
  ctps: string | null;
  ctpsSeries: string | null;
  ctpsIssueDate: string | null;
  ctpsState: string | null;

  // Endereço
  cep: string | null;
  address: string | null;
  addressNumber: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  homePhone: string | null;
  mobilePhone: string | null;
  smsOptIn: boolean;

  // Deficiência
  rehabilitated: boolean;
  disabled: boolean;
  disabilityType: string | null;

  status: EmployeeStatus;
  company: Company;
  branch: Branch | null;
  unit: Unit | null;
  department: { id: string; name: string } | null;
  position: Position | null;

  // Log (só presente quando vem de GET /employees/:id)
  createdAt?: string;
  updatedAt?: string;
  createdByName?: string | null;
  updatedByName?: string | null;
}

// ---- Módulo NR-01 (Avaliação Psicossocial) ----

export type PsychosocialSurveyStatus = "DRAFT" | "ACTIVE" | "CLOSED";

export interface PsychosocialQuestion {
  id: string;
  surveyId: string;
  dimension: string;
  text: string;
  order: number;
}

export interface PsychosocialInviteSummary {
  id: string;
  employeeId: string;
  employeeName: string;
  sentAt: string;
  respondedAt: string | null;
  link: string;
}

export interface PsychosocialSurvey {
  id: string;
  companyId: string;
  branchId: string | null;
  title: string;
  description: string | null;
  status: PsychosocialSurveyStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { questions: number; invites: number; responses: number };
}

export interface PsychosocialSurveyDetail extends Omit<PsychosocialSurvey, "_count"> {
  questions: PsychosocialQuestion[];
  invites: PsychosocialInviteSummary[];
  _count?: { responses: number };
}

// ---- Módulo NR-01 (hub GRO) ----

export interface Nr01Alert {
  severity: "error" | "warning" | "info";
  message: string;
}

export interface Nr01Activity {
  label: string;
  at: string;
}

export interface Nr01Overview {
  risks: {
    total: number;
    evaluated: number;
    byLevel: Record<RiskLevel, number>;
    elevated: number;
    critical: number;
    withControls: number;
    needingControls: number;
  };
  actions: {
    open: number;
    late: number;
    done: number;
    byStatus: Record<ActionStatus, number>;
  };
  reevaluations: { pending: number; supported: boolean };
  pgr: {
    count: number;
    latest: {
      id: string;
      title: string;
      status: PgrStatus;
      version: number;
      updatedAt: string;
      validUntil: string | null;
    } | null;
  };
  alerts: Nr01Alert[];
  activity: Nr01Activity[];
}

export interface Nr01InventoryRow {
  id: string;
  companyId: string;
  companyName: string;
  branchName: string | null;
  pgrId: string;
  pgrTitle: string;
  gheId: string;
  gheName: string;
  activityDescription: string | null;
  hazardId: string;
  hazardName: string;
  hazardCategory: RiskCategory;
  riskLevel: RiskLevel;
  classification: string | null;
  updatedAt: string;
}

export interface PsychosocialPublicOption {
  id: string;
  name: string;
}

export interface PsychosocialPublicSurvey {
  title: string;
  description: string | null;
  companyName: string;
  questions: { id: string; dimension: string; text: string }[];
  branches: PsychosocialPublicOption[];
  departments: PsychosocialPublicOption[];
  positions: PsychosocialPublicOption[];
  ghes: PsychosocialPublicOption[];
}

// ---- Dashboard executivo ----

export interface MonthPoint {
  label: string;
  value: number;
}

export interface ExecutiveSummary {
  asosByMonth: MonthPoint[];
  incidentsByMonth: MonthPoint[];
  activeCompanies: number;
  activeEmployees: number;
  ghes: number;
  positions: number;
  employees: number;
  complianceRate: number | null;
  incidentsThisMonth: number;
  pendingActions: number;
  trainingsExpiringSoon: number;
  documentsNeedingAttention: number;
  criticalRisks: number;
  audits: null;
  generatedAt: string;
}

// ---- Central de Pendências ----

export type PendenciaOrigem = "Ação" | "Documento" | "Risco" | "EPI";
export type PendenciaCriticidade = "alta" | "media";

export interface Pendencia {
  id: string;
  origem: PendenciaOrigem;
  titulo: string;
  unidade: string | null;
  responsavel: string | null;
  prazo: string | null;
  criticidade: PendenciaCriticidade;
  status: string;
  link: string;
}

// ---- GHE (listagem consolidada) ----

export interface Nr01GheListItem {
  id: string;
  name: string;
  code: string | null;
  companyId: string;
  companyName: string;
  pgrId: string;
  pgrTitle: string;
  localDescription: string | null;
  activityDescription: string | null;
  functionsCount: number;
  risksCount: number;
  criticalRisksCount: number;
  employeesCount: number;
}

// ---- Busca global ----

export interface SearchResult {
  type: string;
  label: string;
  sublabel: string | null;
  link: string;
}

// ---- Operação de campo: Inspeções, Não Conformidades, Evidências ----

export type InspectionItemType =
  | "CONFORME_NAO_CONFORME"
  | "SIM_NAO"
  | "NOTA"
  | "TEXTO_LIVRE"
  | "SELECAO_MULTIPLA"
  | "TEXTO_CURTO"
  | "TEXTO_LONGO"
  | "SELECAO_UNICA"
  | "NUMERO"
  | "DATA"
  | "HORA"
  | "ESCALA"
  | "LISTA_SUSPENSA"
  | "UPLOAD"
  | "CLASSIFICACAO"
  | "GRADE";
export type ChecklistTemplateStatus = "RASCUNHO" | "ATIVO" | "INATIVO" | "ARQUIVADO";
export type ChecklistFrequency = "DIARIA" | "SEMANAL" | "MENSAL" | "POR_TURNO" | "POR_EVENTO" | "PERSONALIZADA";
export type NonConformityCreation = "MANUAL" | "AUTOMATICA";
export type InspectionResponseValue = "CONFORME" | "NAO_CONFORME" | "NAO_APLICAVEL";
export type InspectionStatus = "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";
export type NonConformitySeverity = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
export type NonConformityStatus = "ABERTA" | "EM_TRATATIVA" | "RESOLVIDA";
export type EvidenceSourceType =
  | "INSPECTION"
  | "INSPECTION_ITEM_RESPONSE"
  | "NON_CONFORMITY"
  | "BEHAVIOR_OBSERVATION"
  | "OCCURRENCE"
  | "ACTION"
  | "AUDIT"
  | "PGR";

export interface InspectionTemplateSection {
  id: string;
  name: string;
  order: number;
  repeatable: boolean;
  repeatLabel: string | null;
}

export interface InspectionTemplateItem {
  id: string;
  order: number;
  sectionId: string | null;
  text: string;
  instruction: string | null;
  responseType: InspectionItemType;
  category: string | null;
  options: string[];
  blockLabel: string | null;
  required: boolean;
  weight: number | null;
  allowComment: boolean;
  allowPhoto: boolean;
  allowActionPlan: boolean;
  scaleMin: number | null;
  scaleMax: number | null;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
  rows: string[];
  conditionItemId: string | null;
  conditionOperator: "IGUAL" | "DIFERENTE" | null;
  conditionValue: string | null;
}

export interface InspectionTemplate {
  id: string;
  companyId: string | null;
  name: string;
  description: string | null;
  category: string | null;
  active: boolean;
  code: string | null;
  status: ChecklistTemplateStatus;
  version: number;
  previousVersionId: string | null;
  frequency: ChecklistFrequency | null;
  branchId: string | null;
  departmentId: string | null;
  process: string | null;
  responsibleId: string | null;
  ncCreation: NonConformityCreation;
  createdAt: string;
  updatedAt: string;
  sections: InspectionTemplateSection[];
  items: InspectionTemplateItem[];
  _count?: { inspections: number };
}

export interface InspectionTemplateHistoryEntry {
  id: string;
  action: string;
  details: string | null;
  userName: string | null;
  createdAt: string;
}

export interface InspectionBlockItem {
  id: string;
  order: number;
  text: string;
  responseType: InspectionItemType;
  category: string | null;
  options: string[];
  allowPhoto: boolean;
}

export interface InspectionBlock {
  id: string;
  companyId: string | null;
  name: string;
  description: string | null;
  active: boolean;
  items: InspectionBlockItem[];
}

export interface InspectionItemResponse {
  id: string;
  inspectionId: string;
  templateItemId: string;
  value: InspectionResponseValue | null;
  textValue: string | null;
  comment: string | null;
  order: number;
  repetition: number;
}

export interface Inspection {
  id: string;
  companyId: string;
  branchId: string | null;
  departmentId: string | null;
  templateId: string;
  inspectorId: string | null;
  status: InspectionStatus;
  scheduledAt: string | null;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  template: InspectionTemplate;
  _count?: { responses: number; nonConformities: number };
}

export interface InspectionDetail extends Omit<Inspection, "template"> {
  template: InspectionTemplate;
  responses: InspectionItemResponse[];
  nonConformities: NonConformity[];
}

export interface NonConformity {
  id: string;
  companyId: string;
  inspectionId: string | null;
  inspectionItemResponseId: string | null;
  description: string;
  severity: NonConformitySeverity;
  status: NonConformityStatus;
  dueDate: string | null;
  createdAt: string;
  actions?: PgrAction[];
  inspection?: { id: string; templateId: string } | null;
}

export interface Evidence {
  id: string;
  sourceType: EvidenceSourceType;
  sourceId: string;
  fileUrl: string;
  fileName: string;
  mimeType: string | null;
  caption: string | null;
  createdAt: string;
}

// ---- Gerador de Contratos ----

export interface ContractTemplateClause {
  id: string;
  order: number;
  title: string;
  body: string;
}

export interface ContractServiceItem {
  id: string;
  order: number;
  text: string;
}

export interface ContractTemplate {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  clauses: ContractTemplateClause[];
  serviceItems: ContractServiceItem[];
}

export type ContractStatus = "ATIVO" | "CANCELADO";
export type ContractComputedStatus = "ATIVO" | "PROXIMO_VENCIMENTO" | "VENCIDO" | "CANCELADO";

export interface Contract {
  id: string;
  companyId: string | null;
  templateId: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  repNome: string;
  repNacionalidade: string | null;
  repEstadoCivil: string | null;
  repProfissao: string | null;
  repRg: string | null;
  repCpf: string | null;
  quantidadeVidas: number | null;
  dataInicio: string;
  prazoMeses: number;
  dataVencimento: string;
  valorMensalidade: number;
  valorPrimeiraParcela: number | null;
  dataVencimentoPrimeiraParcela: string | null;
  diaVencimentoMensal: number | null;
  formaPagamento: string | null;
  qtdVisitas: number | null;
  frequenciaVisitas: string | null;
  observacoes: string | null;
  status: ContractStatus;
  computedStatus: ContractComputedStatus;
  signingStatus: ContractSigningStatus;
  pdfUrl: string | null;
  pdfGeneratedAt: string | null;
  pdfSha256?: string | null;
  createdAt: string;
  services?: { id: string; serviceItemId: string; serviceItem?: ContractServiceItem }[];
}

export interface ContractDetail extends Contract {
  template: ContractTemplate;
}

export interface ContractPreview {
  templateName: string;
  clauses: { title: string; body: string }[];
}

export type ContractSigningStatus = "NAO_ENVIADO" | "AGUARDANDO_ASSINATURAS" | "ASSINADO";
export type ContractSignatureRole = "CONTRATANTE" | "CONTRATADA";

export interface ContractSignatureSummary {
  role: ContractSignatureRole;
  signerName: string;
  signedAt: string | null;
  linkPending: boolean;
  linkExpiresAt: string | null;
}

export interface ContractSigningPublicSummary {
  status: "pending" | "expired" | "already_signed" | "not_found";
  contract?: {
    templateName: string;
    razaoSocial: string;
    cnpj: string;
    contratadaNome: string;
    valorMensalidade: number;
    dataInicio: string;
    dataVencimento: string;
    clauses: { title: string; body: string }[];
  };
}

export interface ContractIssuer {
  id: string;
  name: string;
  cnpj: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  repNome: string | null;
  repNacionalidade: string | null;
  repEstadoCivil: string | null;
  repProfissao: string | null;
  repRg: string | null;
  repCpf: string | null;
}

export interface EpiCatalogItem {
  id: string;
  name: string;
  category: string;
  mainProtection: string | null;
}

export type EpiSigningStatus = "NAO_ENVIADA" | "AGUARDANDO_ASSINATURA" | "ASSINADA";

export interface EpiDeliveryItem {
  id: string;
  epiCatalogItemId: string | null;
  epiName: string;
  ca: string | null;
  quantity: string | null;
  expiresAt: string | null;
  periodicityMonths: number | null;
  observation: string | null;
  catalogItem?: EpiCatalogItem | null;
}

export interface EpiDelivery {
  id: string;
  companyId: string;
  employeeId: string;
  deliveryDate: string;
  employeeName: string;
  departmentName: string | null;
  positionName: string | null;
  admittedAt: string | null;
  status: "ATIVA" | "CANCELADA";
  pdfUrl: string | null;
  pdfGeneratedAt: string | null;
  signingStatus: EpiSigningStatus;
  items: EpiDeliveryItem[];
}

export interface EpiSigningPublicSummary {
  status: "pending" | "expired" | "already_signed" | "not_found";
  delivery?: {
    employeeName: string;
    departmentName: string | null;
    positionName: string | null;
    companyName: string;
    deliveryDate: string;
    items: { epiName: string; ca: string | null; quantity: string | null; expiresAt: string | null; observation: string | null }[];
  };
}

// ---- Ordem de Serviço ----

export type WorkOrderSigningStatus = "NAO_ENVIADA" | "AGUARDANDO_ASSINATURA" | "ASSINADA";

export interface WorkOrderRiskItem {
  id: string;
  hazardName: string;
  hazardCategory: RiskCategory;
  gheName: string | null;
  typicalInjuries: string | null;
  epiMeasures: string | null;
  riskLevel: RiskLevel;
}

export interface WorkOrderEpiItem {
  id: string;
  epiName: string;
  ca: string | null;
  periodicityMonths: number | null;
}

export interface WorkOrder {
  id: string;
  companyId: string;
  employeeId: string;
  referencePgrId: string;
  issueDate: string;
  employeeName: string;
  departmentName: string | null;
  positionName: string | null;
  admittedAt: string | null;
  pdfUrl: string | null;
  pdfGeneratedAt: string | null;
  signingStatus: WorkOrderSigningStatus;
  riskItems: WorkOrderRiskItem[];
  epiItems: WorkOrderEpiItem[];
}

export interface WorkOrderSigningPublicSummary {
  status: "pending" | "expired" | "already_signed" | "not_found";
  workOrder?: {
    employeeName: string;
    departmentName: string | null;
    positionName: string | null;
    companyName: string;
    issueDate: string;
    riskItems: { hazardName: string; hazardCategory: RiskCategory; riskLevel: RiskLevel }[];
    epiItems: { epiName: string; ca: string | null }[];
  };
}

export interface EpiStockItem {
  id: string;
  name: string;
  ca: string | null;
  category: string | null;
  quantity: number;
  expiresAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ActionScheduleItem {
  id?: string;
  what: string;
  why: string | null;
  place: string | null;
  how: string | null;
  responsible: string | null;
  totalCost: string | number | null;
  followUp: string | null;
  priority: number;
  months: string[];
}

export interface ActionSchedule {
  id: string;
  companyId: string;
  name: string;
  author: string;
  elaboratedAt: string;
  mode: "DRAFT" | "DEFINED";
  type: "GERAL" | "W5H2";
  startMonth: string;
  items: ActionScheduleItem[];
}
