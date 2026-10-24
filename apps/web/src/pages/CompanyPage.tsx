import { FormEvent, useEffect, useRef, useState } from "react";
import { ModalFrame } from "../components/ui/modal";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  Image as ImageIcon,
  MoreVertical,
  Network,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import { CnaePicker } from "../components/CnaePicker";
import { DataLoadWizard } from "../components/DataLoadWizard";
import { useCompanyFilterStore } from "../lib/company-filter-store";
import type { Company } from "../lib/types";

const PGR_STATUS_LABEL: Record<string, string> = { DRAFT: "Rascunho", IN_REVIEW: "Em revisão", APPROVED: "Aprovado", ARCHIVED: "Arquivado" };
const PAGE_SIZE = 9;

export function CompanyPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [template, setTemplate] = useState<Company | null>(null);
  const [showLoad, setShowLoad] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState("");
  const [pgrStatus, setPgrStatus] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const { selectedCompanyId, setSelectedCompanyId, refreshCompanies } = useCompanyFilterStore();

  async function load() {
    setCompanies(await api.get<Company[]>("/companies?withCounts=true"));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(company: Company) {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir "${company.name}"? Essa ação poderá afetar os colaboradores e demais informações vinculadas a ela.`,
    );
    if (!confirmed) return;
    await api.del(`/companies/${company.id}`);
    if (selectedCompanyId === company.id) setSelectedCompanyId(null);
    refreshCompanies();
    load();
  }

  async function handleEdit(company: Company) {
    setLoadingEdit(true);
    try {
      // busca o detalhe completo (inclui o log de criado/atualizado por)
      const full = await api.get<Company>(`/companies/${company.id}`);
      setEditing(full);
    } finally {
      setLoadingEdit(false);
    }
  }

  /** Duplicar: abre o cadastro de uma nova empresa já com os dados de outra (sem CNPJ, que é único). */
  async function handleDuplicate(companyId: string) {
    setMoreOpen(false);
    if (!companyId) return;
    const full = await api.get<Company>(`/companies/${companyId}`);
    setShowForm(false);
    setEditing(null);
    setTemplate(full);
  }

  function handleManage(company: Company) {
    setSelectedCompanyId(company.id);
    navigate(`/empresas/${company.id}`);
  }

  const q = search.trim().toLowerCase();
  const filtered = (companies ?? [])
    .filter((c) => !selectedCompanyId || c.id === selectedCompanyId)
    .filter((c) => !q || [c.name, c.legalName, c.cnpj].some((v) => v?.toLowerCase().includes(q)))
    .filter((c) => !risk || String(c.grauRisco ?? "") === risk)
    .filter((c) => !pgrStatus || (pgrStatus === "NONE" ? !c.pgr : c.pgr?.status === pgrStatus))
    .sort((a, b) => {
      if (sort === "employees") return (b.counts?.employees ?? 0) - (a.counts?.employees ?? 0);
      if (sort === "risk") return (b.grauRisco ?? 0) - (a.grauRisco ?? 0);
      return a.name.localeCompare(b.name, "pt-BR");
    });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const select = "input min-w-[150px]";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">Empresas</h1>
          <p className="mt-1 text-sm text-ink-muted">Gerencie empresas, unidades e indicadores de SST.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-secondary flex items-center gap-1.5" onClick={() => setShowLoad(true)}>
            <Upload size={15} /> Importar dados
          </button>
          <div className="relative">
            <button className="btn-secondary flex items-center gap-1.5" onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen}>
              Mais ações <ChevronDown size={15} />
            </button>
            {moreOpen && (
              <div className="absolute right-0 z-20 mt-1 w-72 rounded-lg border border-line bg-paper-raised p-3 shadow-lg">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="flex items-center gap-1.5 text-ink-muted"><Copy size={13} /> Duplicar qual empresa?</span>
                  <select className="input" defaultValue="" onChange={(e) => handleDuplicate(e.target.value)} aria-label="Empresa a duplicar">
                    <option value="">Selecione…</option>
                    {companies?.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
                {selectedCompanyId && (
                  <button className="mt-3 flex items-center gap-1.5 text-xs text-teal-deep hover:underline" onClick={() => { setSelectedCompanyId(null); setMoreOpen(false); }}>
                    <X size={12} /> Ver todas as empresas
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            className="btn-primary flex items-center gap-1.5"
            onClick={() => {
              setTemplate(null);
              setEditing(null);
              setShowForm(true);
            }}
          >
            <Plus size={15} /> Adicionar empresa
          </button>
        </div>
      </div>

      {showLoad && (
        <DataLoadWizard onClose={() => setShowLoad(false)} onImported={() => { refreshCompanies(); load(); }} />
      )}
      {template && (
        <CompanyForm
          template={template}
          onClose={() => setTemplate(null)}
          onSaved={() => { setTemplate(null); refreshCompanies(); load(); }}
        />
      )}
      {showForm && <CompanyForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); refreshCompanies(); load(); }} />}
      {editing && (
        <CompanyForm
          company={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refreshCompanies(); load(); }}
          onLogoChanged={(updated) => { setEditing(updated); load(); }}
        />
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-paper-raised p-3 shadow-sm">
        <label className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            className="input w-full pl-9"
            placeholder="Buscar por empresa ou CNPJ…"
            aria-label="Buscar empresa"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </label>
        <select className={select} aria-label="Grau de risco" value={risk} onChange={(e) => { setRisk(e.target.value); setPage(1); }}>
          <option value="">Grau de risco</option>
          {[1, 2, 3, 4].map((g) => <option key={g} value={g}>Grau de risco {g}</option>)}
        </select>
        <select className={select} aria-label="Status do PGR" value={pgrStatus} onChange={(e) => { setPgrStatus(e.target.value); setPage(1); }}>
          <option value="">Status do PGR</option>
          <option value="NONE">Sem PGR</option>
          <option value="DRAFT">Rascunho</option>
          <option value="IN_REVIEW">Em revisão</option>
          <option value="APPROVED">Aprovado</option>
        </select>
        <select className={select} aria-label="Ordenar" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="name">Ordenar: Nome</option>
          <option value="employees">Ordenar: Funcionários</option>
          <option value="risk">Ordenar: Grau de risco</option>
        </select>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {companies === null && <p className="text-sm text-ink-muted">Carregando…</p>}
        {companies && filtered.length === 0 && (
          <p className="text-sm text-ink-muted">{companies.length === 0 ? "Nenhuma empresa cadastrada ainda." : "Nenhuma empresa encontrada com esses filtros."}</p>
        )}
        {visible.map((c) => (
          <CompanyCard key={c.id} company={c} disabled={loadingEdit} onManage={() => handleManage(c)} onEdit={() => handleEdit(c)} onDuplicate={() => handleDuplicate(c.id)} onDelete={() => handleDelete(c)} />
        ))}
      </div>

      {filtered.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm text-ink-muted">
          <span>
            Mostrando {(current - 1) * PAGE_SIZE + 1}-{Math.min(current * PAGE_SIZE, filtered.length)} de {filtered.length} {filtered.length === 1 ? "empresa" : "empresas"}
          </span>
          <div className="flex items-center gap-1">
            <button className="rounded-md border border-line bg-paper-raised p-1.5 disabled:opacity-40" disabled={current <= 1} onClick={() => setPage(current - 1)} aria-label="Página anterior">
              <ChevronLeft size={15} />
            </button>
            <span className="min-w-[2rem] rounded-md bg-teal px-2 py-1 text-center font-medium text-white">{current}</span>
            <button className="rounded-md border border-line bg-paper-raised p-1.5 disabled:opacity-40" disabled={current >= pages} onClick={() => setPage(current + 1)} aria-label="Próxima página">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CompanyCard({
  company: c,
  disabled,
  onManage,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  company: Company;
  disabled: boolean;
  onManage: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const stats: [string, number | undefined, typeof Users][] = [
    ["Funcionários", c.counts?.employees, Users],
    ["Cargos", c.counts?.positions, BriefcaseBusiness],
    ["GHE", c.counts?.ghes, Network],
    ["Ações pendentes", c.counts?.pendingActions, ClipboardList],
  ];
  const priority = c.counts?.priorityRisks ?? 0;
  return (
    <div className="card flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {c.logoUrl ? (
              <img src={c.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded object-contain" />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-paper text-ink-muted"><ImageIcon size={14} /></span>
            )}
            <p className="truncate font-display text-xl font-extrabold text-ink">{c.name}</p>
          </div>
          {c.legalName && <p className="mt-1 truncate text-sm text-ink-muted">{c.legalName}</p>}
          <p className="mt-1 font-mono text-xs text-ink-muted">{c.cnpj ?? "sem CNPJ"}</p>
        </div>
        {c.unidadeContratante && <span className="tag shrink-0">Contratante</span>}
      </div>
      {c.grauRisco != null && (
        <span className={`mt-3 w-fit rounded-full px-3 py-1 text-xs font-semibold ${c.grauRisco >= 3 ? "bg-danger-tint text-danger" : "bg-teal-tint text-teal-deep"}`}>
          Grau de risco {c.grauRisco}
        </span>
      )}

      <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
        {stats.map(([label, value, Icon]) => (
          <div key={label} className="rounded-lg bg-paper px-1 py-2.5">
            <Icon size={16} className="mx-auto text-teal-deep" aria-hidden />
            <dd className="mt-1 font-display text-lg font-semibold tabular-nums text-ink">{value ?? "—"}</dd>
            <dt className="text-[11px] leading-tight text-ink-muted">{label}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3 text-sm">
        <p className="flex items-center gap-2 text-ink">
          {c.pgr ? <CheckCircle2 size={17} className="text-teal" /> : <AlertTriangle size={17} className="text-amber" />}
          {c.pgr
            ? `PGR atualizado em ${new Date(c.pgr.updatedAt).toLocaleDateString("pt-BR")} · ${PGR_STATUS_LABEL[c.pgr.status] ?? c.pgr.status}`
            : "Nenhum PGR criado"}
        </p>
        <p className={`flex items-center gap-2 ${priority > 0 ? "font-medium text-amber" : "text-ink"}`}>
          {priority > 0 ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} className="text-teal" />}
          {priority} {priority === 1 ? "risco prioritário" : "riscos prioritários"}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={onManage}
          className="flex-1 rounded-lg border border-teal px-4 py-2.5 text-sm font-semibold text-teal-deep transition-colors hover:bg-teal-tint"
        >
          Gerenciar empresa
        </button>
        <div className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            aria-label={`Mais opções de ${c.name}`}
            aria-expanded={menu}
            className="rounded-lg border border-line p-2.5 text-ink-muted hover:bg-teal-tint hover:text-ink"
          >
            <MoreVertical size={16} />
          </button>
          {menu && (
            <div className="absolute bottom-full right-0 z-20 mb-1 w-40 overflow-hidden rounded-lg border border-line bg-paper-raised py-1 text-sm shadow-lg" onMouseLeave={() => setMenu(false)}>
              <button disabled={disabled} onClick={() => { setMenu(false); onEdit(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-ink hover:bg-teal-tint">
                <Pencil size={13} /> Editar
              </button>
              <button onClick={() => { setMenu(false); onDuplicate(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-ink hover:bg-teal-tint">
                <Copy size={13} /> Duplicar
              </button>
              <button onClick={() => { setMenu(false); onDelete(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-amber hover:bg-amber-tint">
                <Trash2 size={13} /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

interface FormState {
  name: string;
  legalName: string;
  cnpj: string;
  unidadeContratante: boolean;
  cpf: string;
  cei: string;
  caepf: string;
  cno: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  telefone: string;
  codigoRH: string;
  cnae: string;
  cnaeSecundario: string;
  grauRisco: string;
  caracterizacaoProcessos: string;
  descricaoLocal: string;
  desconsiderarEsocial: boolean;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cepCobranca: string;
  enderecoCobranca: string;
  numeroCobranca: string;
  complementoCobranca: string;
  bairroCobranca: string;
  cidadeCobranca: string;
  estadoCobranca: string;
  dataContrato: string;
  observacaoPPP: string;
  observacaoASO: string;
  percentualBrigada: string;
  contractedLives: string;
}

function toFormState(c?: Company): FormState {
  return {
    name: c?.name ?? "",
    legalName: c?.legalName ?? "",
    cnpj: c?.cnpj ?? "",
    unidadeContratante: c?.unidadeContratante ?? false,
    cpf: c?.cpf ?? "",
    cei: c?.cei ?? "",
    caepf: c?.caepf ?? "",
    cno: c?.cno ?? "",
    inscricaoEstadual: c?.inscricaoEstadual ?? "",
    inscricaoMunicipal: c?.inscricaoMunicipal ?? "",
    telefone: c?.telefone ?? "",
    codigoRH: c?.codigoRH ?? "",
    cnae: c?.cnae ?? "",
    cnaeSecundario: c?.cnaeSecundario ?? "",
    grauRisco: c?.grauRisco != null ? String(c.grauRisco) : "",
    caracterizacaoProcessos: c?.caracterizacaoProcessos ?? "",
    descricaoLocal: c?.descricaoLocal ?? "",
    desconsiderarEsocial: c?.desconsiderarEsocial ?? false,
    cep: c?.cep ?? "",
    endereco: c?.endereco ?? "",
    numero: c?.numero ?? "",
    complemento: c?.complemento ?? "",
    bairro: c?.bairro ?? "",
    cidade: c?.cidade ?? "",
    estado: c?.estado ?? "",
    cepCobranca: c?.cepCobranca ?? "",
    enderecoCobranca: c?.enderecoCobranca ?? "",
    numeroCobranca: c?.numeroCobranca ?? "",
    complementoCobranca: c?.complementoCobranca ?? "",
    bairroCobranca: c?.bairroCobranca ?? "",
    cidadeCobranca: c?.cidadeCobranca ?? "",
    estadoCobranca: c?.estadoCobranca ?? "",
    dataContrato: c?.dataContrato ? c.dataContrato.slice(0, 10) : "",
    observacaoPPP: c?.observacaoPPP ?? "",
    observacaoASO: c?.observacaoASO ?? "",
    percentualBrigada: c?.percentualBrigada != null ? String(c.percentualBrigada) : "",
    contractedLives: c?.contractedLives != null ? String(c.contractedLives) : "",
  };
}

export function CompanyForm({
  company,
  template,
  onClose,
  onSaved,
  onLogoChanged,
}: {
  company?: Company;
  /** Cadastro de nova empresa a partir de outra (duplicar): copia os dados, sem CNPJ. */
  template?: Company;
  onClose: () => void;
  onSaved: () => void;
  onLogoChanged?: (updated: Company) => void;
}) {
  const [f, setF] = useState<FormState>(() =>
    template ? { ...toFormState(template), name: `Cópia de ${template.name}`, cnpj: "" } : toFormState(company),
  );
  const [cobrancaIgualEndereco, setCobrancaIgualEndereco] = useState(() =>
    !!(company ?? template) && !(company ?? template)!.cepCobranca && !(company ?? template)!.enderecoCobranca,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const usaEnderecoPrincipal = cobrancaIgualEndereco;
      const payload = {
        name: f.name,
        legalName: f.legalName || undefined,
        cnpj: f.cnpj || undefined,
        unidadeContratante: f.unidadeContratante,
        cpf: f.cpf || undefined,
        cei: f.cei || undefined,
        caepf: f.caepf || undefined,
        cno: f.cno || undefined,
        inscricaoEstadual: f.inscricaoEstadual || undefined,
        inscricaoMunicipal: f.inscricaoMunicipal || undefined,
        telefone: f.telefone || undefined,
        codigoRH: f.codigoRH || undefined,
        cnae: f.cnae || undefined,
        cnaeSecundario: f.cnaeSecundario || undefined,
        grauRisco: f.grauRisco ? Number(f.grauRisco) : undefined,
        caracterizacaoProcessos: f.caracterizacaoProcessos || undefined,
        descricaoLocal: f.descricaoLocal || undefined,
        desconsiderarEsocial: f.desconsiderarEsocial,
        cep: f.cep || undefined,
        endereco: f.endereco || undefined,
        numero: f.numero || undefined,
        complemento: f.complemento || undefined,
        bairro: f.bairro || undefined,
        cidade: f.cidade || undefined,
        estado: f.estado || undefined,
        cepCobranca: usaEnderecoPrincipal ? f.cep || undefined : f.cepCobranca || undefined,
        enderecoCobranca: usaEnderecoPrincipal ? f.endereco || undefined : f.enderecoCobranca || undefined,
        numeroCobranca: usaEnderecoPrincipal ? f.numero || undefined : f.numeroCobranca || undefined,
        complementoCobranca: usaEnderecoPrincipal ? f.complemento || undefined : f.complementoCobranca || undefined,
        bairroCobranca: usaEnderecoPrincipal ? f.bairro || undefined : f.bairroCobranca || undefined,
        cidadeCobranca: usaEnderecoPrincipal ? f.cidade || undefined : f.cidadeCobranca || undefined,
        estadoCobranca: usaEnderecoPrincipal ? f.estado || undefined : f.estadoCobranca || undefined,
        dataContrato: f.dataContrato || undefined,
        observacaoPPP: f.observacaoPPP || undefined,
        observacaoASO: f.observacaoASO || undefined,
        percentualBrigada: f.percentualBrigada ? Number(f.percentualBrigada) : undefined,
        contractedLives: f.contractedLives ? Math.max(0, Math.round(Number(f.contractedLives))) : undefined,
      };
      if (company) {
        await api.patch(`/companies/${company.id}`, payload);
      } else {
        await api.post("/companies", payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalFrame title={company ? "Editar empresa" : template ? "Duplicar empresa" : "Nova empresa"} onClose={onClose}>
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6">
      {company && onLogoChanged && (
        <FormSection title="Logo">
          <CompanyLogoUploader company={company} onChanged={onLogoChanged} />
        </FormSection>
      )}

      <FormSection title="Identificação">
        <FieldGrid>
          <TextField label="Nome" value={f.name} onChange={(v) => set("name", v)} required />
          <TextField label="Razão social" value={f.legalName} onChange={(v) => set("legalName", v)} />
          <TextField label="CNPJ" value={f.cnpj} onChange={(v) => set("cnpj", v)} />
          <TextField label="CPF" value={f.cpf} onChange={(v) => set("cpf", v)} hint="pessoa física / MEI" />
          <TextField label="Telefone" value={f.telefone} onChange={(v) => set("telefone", v)} />
          <TextField label="CEI" value={f.cei} onChange={(v) => set("cei", v)} />
          <TextField label="CAEPF" value={f.caepf} onChange={(v) => set("caepf", v)} />
          <TextField label="CNO" value={f.cno} onChange={(v) => set("cno", v)} />
          <TextField label="Inscrição estadual" value={f.inscricaoEstadual} onChange={(v) => set("inscricaoEstadual", v)} />
          <TextField label="Inscrição municipal" value={f.inscricaoMunicipal} onChange={(v) => set("inscricaoMunicipal", v)} />
          <TextField label="Código no RH" value={f.codigoRH} onChange={(v) => set("codigoRH", v)} hint="referência externa, se houver" />
        </FieldGrid>
        <CheckboxField
          label="Unidade contratante"
          hint="assina contratos diretamente, não só opera"
          checked={f.unidadeContratante}
          onChange={(v) => set("unidadeContratante", v)}
        />
      </FormSection>

      <FormSection title="CNAE e caracterização de risco">
        <FieldGrid>
          <CnaePicker label="CNAE principal" value={f.cnae} onChange={(v) => set("cnae", v)} onPick={(e) => set("grauRisco", String(e.riskGrade))} />
          <CnaePicker label="CNAE secundário" value={f.cnaeSecundario} onChange={(v) => set("cnaeSecundario", v)} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Grau de risco (NR-4)</span>
            <select className="input" value={f.grauRisco} onChange={(e) => set("grauRisco", e.target.value)}>
              <option value="">—</option>
              {[1, 2, 3, 4].map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
        </FieldGrid>
        <TextAreaField label="Caracterização dos processos e ambientes de trabalho" value={f.caracterizacaoProcessos} onChange={(v) => set("caracterizacaoProcessos", v)} />
        <TextAreaField label="Descrição do local" value={f.descricaoLocal} onChange={(v) => set("descricaoLocal", v)} />
        <CheckboxField
          label="Desconsiderar para eSocial"
          checked={f.desconsiderarEsocial}
          onChange={(v) => set("desconsiderarEsocial", v)}
        />
      </FormSection>

      <FormSection title="Endereço">
        <AddressFields
          cep={f.cep} endereco={f.endereco} numero={f.numero} complemento={f.complemento}
          bairro={f.bairro} cidade={f.cidade} estado={f.estado}
          onChange={(field, v) => set(field, v)}
        />
      </FormSection>

      <FormSection title="Endereço de cobrança">
        <CheckboxField
          label="Igual ao endereço acima"
          checked={cobrancaIgualEndereco}
          onChange={setCobrancaIgualEndereco}
        />
        {!cobrancaIgualEndereco && (
          <div className="mt-3">
            <AddressFields
              cep={f.cepCobranca} endereco={f.enderecoCobranca} numero={f.numeroCobranca} complemento={f.complementoCobranca}
              bairro={f.bairroCobranca} cidade={f.cidadeCobranca} estado={f.estadoCobranca}
              onChange={(field, v) => set(`${field}Cobranca` as keyof FormState, v)}
            />
          </div>
        )}
      </FormSection>

      <FormSection title="Contrato, PPP, ASO e brigada de incêndio">
        <FieldGrid>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Data de assinatura do contrato</span>
            <input type="date" className="input" value={f.dataContrato} onChange={(e) => set("dataContrato", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">% considerado no cálculo da brigada</span>
            <input type="number" step="0.01" min="0" max="100" className="input" value={f.percentualBrigada} onChange={(e) => set("percentualBrigada", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Vidas contratadas <span className="font-normal opacity-70">(base para as vidas excedentes)</span></span>
            <input type="number" min="0" step="1" className="input" value={f.contractedLives} onChange={(e) => set("contractedLives", e.target.value)} />
          </label>
        </FieldGrid>
        <TextAreaField label="Observação — PPP" value={f.observacaoPPP} onChange={(v) => set("observacaoPPP", v)} />
        <TextAreaField label="Observação — ASO" value={f.observacaoASO} onChange={(v) => set("observacaoASO", v)} />
      </FormSection>

      {company && (company.createdByName || company.updatedByName) && (
        <FormSection title="Log">
          <div className="grid grid-cols-1 gap-2 text-xs text-ink-muted sm:grid-cols-2">
            {company.createdByName && (
              <p>Incluído por <span className="text-ink">{company.createdByName}</span>{company.createdAt && ` em ${new Date(company.createdAt).toLocaleString("pt-BR")}`}</p>
            )}
            {company.updatedByName && (
              <p>Última alteração por <span className="text-ink">{company.updatedByName}</span>{company.updatedAt && ` em ${new Date(company.updatedAt).toLocaleString("pt-BR")}`}</p>
            )}
          </div>
        </FormSection>
      )}

      <div className="flex items-center gap-3 border-t border-line pt-4">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        {error && <p className="text-sm text-amber">{error}</p>}
      </div>
    </form>
    </ModalFrame>
  );
}

function CompanyLogoUploader({ company, onChanged }: { company: Company; onChanged: (updated: Company) => void }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const updated = await api.postForm<Company>(`/companies/${company.id}/logo`, formData);
      onChanged(updated);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!window.confirm("Remover o logo desta empresa?")) return;
    const updated = await api.del<Company>(`/companies/${company.id}/logo`);
    onChanged(updated);
  }

  return (
    <div className="flex items-center gap-3">
      {company.logoUrl ? (
        <img src={company.logoUrl} alt="" className="h-14 w-14 rounded border border-line object-contain" />
      ) : (
        <span className="flex h-14 w-14 items-center justify-center rounded border border-line bg-paper-raised text-ink-muted">
          <ImageIcon size={20} />
        </span>
      )}
      <div className="flex items-center gap-2">
        <label className="btn-secondary flex cursor-pointer items-center gap-1.5 text-xs">
          {uploading ? "Enviando…" : company.logoUrl ? "Trocar logo" : "Enviar logo"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
        {company.logoUrl && (
          <button type="button" onClick={handleRemove} className="text-xs text-amber hover:underline">
            Remover
          </button>
        )}
      </div>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 font-display text-sm font-semibold text-ink-muted">{title}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function TextField({
  label, value, onChange, required, hint,
}: { label: string; value: string; onChange: (v: string) => void; required?: boolean; hint?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-ink-muted">{label}{hint && <span className="ml-1 font-normal opacity-70">({hint})</span>}</span>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </label>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-ink-muted">{label}</span>
      <textarea className="input min-h-[70px] resize-y" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function CheckboxField({
  label, hint, checked, onChange,
}: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
      {hint && <span className="text-xs text-ink-muted">({hint})</span>}
    </label>
  );
}

function AddressFields({
  cep, endereco, numero, complemento, bairro, cidade, estado, onChange,
}: {
  cep: string; endereco: string; numero: string; complemento: string; bairro: string; cidade: string; estado: string;
  onChange: (field: "cep" | "endereco" | "numero" | "complemento" | "bairro" | "cidade" | "estado", v: string) => void;
}) {
  return (
    <FieldGrid>
      <TextField label="CEP" value={cep} onChange={(v) => onChange("cep", v)} />
      <TextField label="Endereço" value={endereco} onChange={(v) => onChange("endereco", v)} />
      <TextField label="Número" value={numero} onChange={(v) => onChange("numero", v)} />
      <TextField label="Complemento" value={complemento} onChange={(v) => onChange("complemento", v)} />
      <TextField label="Bairro" value={bairro} onChange={(v) => onChange("bairro", v)} />
      <TextField label="Cidade" value={cidade} onChange={(v) => onChange("cidade", v)} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Estado</span>
        <select className="input" value={estado} onChange={(e) => onChange("estado", e.target.value)}>
          <option value="">—</option>
          {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
        </select>
      </label>
    </FieldGrid>
  );
}
