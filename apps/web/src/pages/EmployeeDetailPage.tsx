import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { CreatableSelect } from "../components/CreatableSelect";
import type { Branch, Department, Employee, Position } from "../lib/types";

const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const TABS = ["cadastro", "lotacao", "cargo", "endereco", "deficiencia", "log"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  cadastro: "Dados Cadastrais",
  lotacao: "Lotação",
  cargo: "Cargo e Função",
  endereco: "Endereço",
  deficiencia: "Deficiência",
  log: "Log",
};

function calcAge(birthDate: string): number | null {
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

function calcServiceTime(admittedAt: string): string | null {
  const start = new Date(admittedAt);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ano${years > 1 ? "s" : ""}`);
  if (months > 0 || years === 0) parts.push(`${months} ${months === 1 ? "mês" : "meses"}`);
  return parts.join(" e ");
}

interface FormState {
  name: string;
  status: Employee["status"];
  leaveReason: string;
  birthDate: string;
  admittedAt: string;
  inactivatedAt: string;
  sex: string;
  rg: string;
  rgIssueDate: string;
  rgIssuer: string;
  rgExpiryDate: string;
  cpf: string;
  registration: string;
  nit: string;
  ctps: string;
  ctpsSeries: string;
  ctpsIssueDate: string;
  ctpsState: string;

  branchId: string;
  departmentId: string;
  positionId: string;

  cep: string;
  address: string;
  addressNumber: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  homePhone: string;
  mobilePhone: string;
  smsOptIn: boolean;

  rehabilitated: boolean;
  disabled: boolean;
  disabilityType: string;
}

function toFormState(e?: Employee): FormState {
  return {
    name: e?.name ?? "",
    status: e?.status ?? "ACTIVE",
    leaveReason: e?.leaveReason ?? "",
    birthDate: e?.birthDate ? e.birthDate.slice(0, 10) : "",
    admittedAt: e?.admittedAt ? e.admittedAt.slice(0, 10) : "",
    inactivatedAt: e?.inactivatedAt ? e.inactivatedAt.slice(0, 10) : "",
    sex: e?.sex ?? "",
    rg: e?.rg ?? "",
    rgIssueDate: e?.rgIssueDate ? e.rgIssueDate.slice(0, 10) : "",
    rgIssuer: e?.rgIssuer ?? "",
    rgExpiryDate: e?.rgExpiryDate ? e.rgExpiryDate.slice(0, 10) : "",
    cpf: e?.cpf ?? "",
    registration: e?.registration ?? "",
    nit: e?.nit ?? "",
    ctps: e?.ctps ?? "",
    ctpsSeries: e?.ctpsSeries ?? "",
    ctpsIssueDate: e?.ctpsIssueDate ? e.ctpsIssueDate.slice(0, 10) : "",
    ctpsState: e?.ctpsState ?? "",

    branchId: e?.branchId ?? "",
    departmentId: e?.departmentId ?? "",
    positionId: e?.positionId ?? "",

    cep: e?.cep ?? "",
    address: e?.address ?? "",
    addressNumber: e?.addressNumber ?? "",
    complement: e?.complement ?? "",
    neighborhood: e?.neighborhood ?? "",
    city: e?.city ?? "",
    state: e?.state ?? "",
    homePhone: e?.homePhone ?? "",
    mobilePhone: e?.mobilePhone ?? "",
    smsOptIn: e?.smsOptIn ?? false,

    rehabilitated: e?.rehabilitated ?? false,
    disabled: e?.disabled ?? false,
    disabilityType: e?.disabilityType ?? "",
  };
}

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [tab, setTab] = useState<Tab>("cadastro");
  const [f, setF] = useState<FormState>(() => toFormState());
  const [positionDescription, setPositionDescription] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<Employee>(`/employees/${id}`)
      .then((emp) => {
        setEmployee(emp);
        setF(toFormState(emp));
        setPositionDescription(emp.position?.description ?? "");
        return Promise.all([
          api.get<Branch[]>(`/branches?companyId=${encodeURIComponent(emp.companyId)}`),
          api.get<Department[]>(`/departments?companyId=${encodeURIComponent(emp.companyId)}`),
          api.get<Position[]>(`/positions?companyId=${encodeURIComponent(emp.companyId)}`),
        ]);
      })
      .then(([b, d, p]) => {
        setBranches(b);
        setDepartments(d);
        setPositions(p);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar colaborador."))
      .finally(() => setLoading(false));
  }, [id]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!employee) return;
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/employees/${employee.id}`, {
        name: f.name,
        status: f.status,
        leaveReason: f.leaveReason || undefined,
        birthDate: f.birthDate || undefined,
        admittedAt: f.admittedAt || undefined,
        inactivatedAt: f.inactivatedAt || undefined,
        sex: f.sex || undefined,
        rg: f.rg || undefined,
        rgIssueDate: f.rgIssueDate || undefined,
        rgIssuer: f.rgIssuer || undefined,
        rgExpiryDate: f.rgExpiryDate || undefined,
        cpf: f.cpf || undefined,
        registration: f.registration || undefined,
        nit: f.nit || undefined,
        ctps: f.ctps || undefined,
        ctpsSeries: f.ctpsSeries || undefined,
        ctpsIssueDate: f.ctpsIssueDate || undefined,
        ctpsState: f.ctpsState || undefined,
        branchId: f.branchId || undefined,
        departmentId: f.departmentId || undefined,
        positionId: f.positionId || undefined,
        cep: f.cep || undefined,
        address: f.address || undefined,
        addressNumber: f.addressNumber || undefined,
        complement: f.complement || undefined,
        neighborhood: f.neighborhood || undefined,
        city: f.city || undefined,
        state: f.state || undefined,
        homePhone: f.homePhone || undefined,
        mobilePhone: f.mobilePhone || undefined,
        smsOptIn: f.smsOptIn,
        rehabilitated: f.rehabilitated,
        disabled: f.disabled,
        disabilityType: f.disabilityType || undefined,
      });
      const refreshed = await api.get<Employee>(`/employees/${employee.id}`);
      setEmployee(refreshed);
      setF(toFormState(refreshed));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!employee) return;
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir "${employee.name}"? Essa ação removerá o colaborador do sistema.`,
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      await api.del(`/employees/${employee.id}`);
      navigate("/cadastros/estrutura/funcionarios");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
      setDeleting(false);
    }
  }

  async function handleSaveDescription() {
    if (!employee?.position) return;
    setSavingDescription(true);
    try {
      const updated = await api.patch<Position>(`/positions/${employee.position.id}`, {
        description: positionDescription || undefined,
      });
      setPositions((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEmployee((prev) => (prev ? { ...prev, position: updated } : prev));
    } finally {
      setSavingDescription(false);
    }
  }

  if (loading) return <p className="text-sm text-ink-muted">Carregando…</p>;
  if (error && !employee) return <p className="text-sm text-amber">{error}</p>;
  if (!employee) return null;

  const age = f.birthDate ? calcAge(f.birthDate) : null;
  const serviceTime = f.admittedAt ? calcServiceTime(f.admittedAt) : null;

  return (
    <div>
      <button
        onClick={() => navigate("/cadastros/estrutura/funcionarios")}
        className="mb-4 flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={15} /> Voltar para Colaboradores
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{employee.name}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {employee.company.name}
            {employee.registration && ` · Matrícula ${employee.registration}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={f.status} />
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-xs text-amber hover:underline disabled:opacity-50"
          >
            <Trash2 size={13} /> {deleting ? "Excluindo…" : "Excluir"}
          </button>
        </div>
      </div>

      <div className="mt-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              tab === t ? "border-b-2 border-teal text-teal-deep" : "text-ink-muted hover:text-ink"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
        {tab === "cadastro" && (
          <>
            <FieldGrid>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-ink-muted">Situação</span>
                <select className="input" value={f.status} onChange={(e) => set("status", e.target.value as Employee["status"])}>
                  <option value="ACTIVE">Ativo</option>
                  <option value="ON_LEAVE">Afastado</option>
                  <option value="TERMINATED">Inativo</option>
                </select>
              </label>
              <TextField label="Nome" value={f.name} onChange={(v) => set("name", v)} required />
              <TextField label="Motivo Licença" value={f.leaveReason} onChange={(v) => set("leaveReason", v)} />
              <DateField label="Data de Nascimento" value={f.birthDate} onChange={(v) => set("birthDate", v)} required />
              <ReadOnlyField label="Idade" value={age != null ? `${age} anos` : "—"} />
              <DateField label="Admissão" value={f.admittedAt} onChange={(v) => set("admittedAt", v)} required />
              <ReadOnlyField label="Tempo de Serviço" value={serviceTime ?? "—"} />
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-ink-muted">Sexo</span>
                <select className="input" value={f.sex} onChange={(e) => set("sex", e.target.value)}>
                  <option value="">—</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </label>
              <DateField label="Data de Inativação" value={f.inactivatedAt} onChange={(v) => set("inactivatedAt", v)} />
            </FieldGrid>

            <FormSection title="Documentos">
              <FieldGrid>
                <TextField label="RG" value={f.rg} onChange={(v) => set("rg", v)} />
                <DateField label="Data de Emissão RG" value={f.rgIssueDate} onChange={(v) => set("rgIssueDate", v)} />
                <TextField label="Órgão Expedidor" value={f.rgIssuer} onChange={(v) => set("rgIssuer", v)} />
                <DateField label="Data de Validade RG" value={f.rgExpiryDate} onChange={(v) => set("rgExpiryDate", v)} />
                <TextField label="CPF" value={f.cpf} onChange={(v) => set("cpf", v)} required />
                <TextField label="NIT (PIS/PASEP)" value={f.nit} onChange={(v) => set("nit", v)} />
                <TextField label="Matrícula" value={f.registration} onChange={(v) => set("registration", v)} />
                <TextField label="CTPS" value={f.ctps} onChange={(v) => set("ctps", v)} />
                <TextField label="Série CTPS" value={f.ctpsSeries} onChange={(v) => set("ctpsSeries", v)} />
                <DateField label="Data de Emissão CTPS" value={f.ctpsIssueDate} onChange={(v) => set("ctpsIssueDate", v)} />
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-ink-muted">UF CTPS</span>
                  <select className="input" value={f.ctpsState} onChange={(e) => set("ctpsState", e.target.value)}>
                    <option value="">—</option>
                    {ESTADOS.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </label>
              </FieldGrid>
            </FormSection>
          </>
        )}

        {tab === "lotacao" && (
          <FieldGrid>
            <ReadOnlyField
              label="Unidade Contratante"
              value={employee.company.unidadeContratante ? "Sim" : "Não"}
              hint="herdado da empresa"
            />
            <CreatableSelect
              label="Unidade"
              options={branches}
              value={f.branchId}
              onChange={(v) => set("branchId", v)}
              onCreate={(name) => api.post<Branch>("/branches", { name, companyId: employee.companyId })}
            />
            <CreatableSelect
              label="Setor"
              options={departments}
              value={f.departmentId}
              onChange={(v) => set("departmentId", v)}
              onCreate={(name) => api.post<Department>("/departments", { name, companyId: employee.companyId })}
            />
            <CreatableSelect
              label="Cargo"
              options={positions}
              value={f.positionId}
              onChange={(v) => set("positionId", v)}
              onCreate={(name) => api.post<Position>("/positions", { name, companyId: employee.companyId })}
            />
          </FieldGrid>
        )}

        {tab === "cargo" && (
          <FormSection title={employee.position ? `Atividades — ${employee.position.name}` : "Atividades"}>
            {employee.position ? (
              <>
                <p className="text-xs text-ink-muted">
                  Descrição do cargo conforme CBO — vale para todo colaborador com esse cargo nesta empresa.
                </p>
                <textarea
                  className="input min-h-[160px] resize-y"
                  value={positionDescription}
                  onChange={(e) => setPositionDescription(e.target.value)}
                  placeholder="Descreva as atividades típicas deste cargo…"
                />
                <button
                  type="button"
                  disabled={savingDescription}
                  onClick={handleSaveDescription}
                  className="btn-secondary self-start text-xs"
                >
                  {savingDescription ? "Salvando…" : "Salvar descrição do cargo"}
                </button>
              </>
            ) : (
              <p className="text-sm text-ink-muted">Defina o cargo na aba Lotação para descrever suas atividades.</p>
            )}
          </FormSection>
        )}

        {tab === "endereco" && (
          <FieldGrid>
            <TextField label="CEP" value={f.cep} onChange={(v) => set("cep", v)} />
            <TextField label="Endereço" value={f.address} onChange={(v) => set("address", v)} />
            <TextField label="Número" value={f.addressNumber} onChange={(v) => set("addressNumber", v)} />
            <TextField label="Complemento" value={f.complement} onChange={(v) => set("complement", v)} />
            <TextField label="Bairro" value={f.neighborhood} onChange={(v) => set("neighborhood", v)} />
            <TextField label="Cidade" value={f.city} onChange={(v) => set("city", v)} />
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Estado</span>
              <select className="input" value={f.state} onChange={(e) => set("state", e.target.value)}>
                <option value="">—</option>
                {ESTADOS.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </label>
            <TextField label="Telefone Residencial" value={f.homePhone} onChange={(v) => set("homePhone", v)} />
            <TextField label="Telefone Celular" value={f.mobilePhone} onChange={(v) => set("mobilePhone", v)} />
            <CheckboxField label="Enviar SMS" checked={f.smsOptIn} onChange={(v) => set("smsOptIn", v)} />
          </FieldGrid>
        )}

        {tab === "deficiencia" && (
          <FieldGrid>
            <CheckboxField label="Reabilitado" checked={f.rehabilitated} onChange={(v) => set("rehabilitated", v)} />
            <CheckboxField label="Deficiente" checked={f.disabled} onChange={(v) => set("disabled", v)} />
            <TextField label="Tipo de Deficiência" value={f.disabilityType} onChange={(v) => set("disabilityType", v)} />
          </FieldGrid>
        )}

        {tab === "log" && (
          <FormSection title="Auditoria do cadastro">
            <div className="grid grid-cols-1 gap-2 text-xs text-ink-muted sm:grid-cols-2">
              <p>
                Incluído por{" "}
                <span className="text-ink">{employee.createdByName ?? "—"}</span>
                {employee.createdAt && ` em ${new Date(employee.createdAt).toLocaleString("pt-BR")}`}
              </p>
              <p>
                Última alteração por{" "}
                <span className="text-ink">{employee.updatedByName ?? "—"}</span>
                {employee.updatedAt && ` em ${new Date(employee.updatedAt).toLocaleString("pt-BR")}`}
              </p>
            </div>
            <p className="text-[11px] text-ink-muted">
              Essas informações são geradas automaticamente pelo sistema.
            </p>
          </FormSection>
        )}

        <div className="flex items-center gap-3 border-t border-line pt-4">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Salvando…" : "Salvar"}
          </button>
          {error && <p className="text-sm text-amber">{error}</p>}
        </div>
      </form>
    </div>
  );
}

function StatusBadge({ status }: { status: Employee["status"] }) {
  const map: Record<Employee["status"], string> = {
    ACTIVE: "bg-teal-tint text-teal-deep",
    ON_LEAVE: "bg-amber-tint text-amber",
    TERMINATED: "bg-line text-ink-muted",
  };
  const label: Record<Employee["status"], string> = {
    ACTIVE: "Ativo",
    ON_LEAVE: "Afastado",
    TERMINATED: "Inativo",
  };
  return <span className={`rounded px-2.5 py-1 text-xs font-medium ${map[status]}`}>{label[status]}</span>;
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display text-sm font-semibold text-ink-muted">{title}</h3>
      {children}
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function TextField({
  label, value, onChange, required,
}: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-ink-muted">
        {label}
        {required && <span className="text-amber">*</span>}
      </span>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </label>
  );
}

function DateField({
  label, value, onChange, required,
}: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-ink-muted">
        {label}
        {required && <span className="text-amber">*</span>}
      </span>
      <input type="date" className="input" value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </label>
  );
}

function ReadOnlyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-ink-muted">
        {label}
        {hint && <span className="ml-1 font-normal opacity-70">({hint})</span>}
      </span>
      <span className="input flex items-center bg-line/30 text-ink-muted">{value}</span>
    </div>
  );
}

function CheckboxField({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
