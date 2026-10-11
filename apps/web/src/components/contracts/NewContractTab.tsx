import { useEffect, useState } from "react";
import { CheckCircle2, FileDown, Pencil, Eye } from "lucide-react";
import { api } from "../../lib/api";
import type { Company, Contract, ContractDetail, ContractPreview, ContractTemplate } from "../../lib/types";

type Step = "form" | "preview" | "done";

interface FormState {
  companyId: string;
  templateId: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  repNome: string;
  repNacionalidade: string;
  repEstadoCivil: string;
  repProfissao: string;
  repRg: string;
  repCpf: string;
  quantidadeVidas: string;
  dataInicio: string;
  prazoMeses: string;
  valorMensalidade: string;
  valorPrimeiraParcela: string;
  dataVencimentoPrimeiraParcela: string;
  diaVencimentoMensal: string;
  formaPagamento: string;
  qtdVisitas: string;
  frequenciaVisitas: string;
  observacoes: string;
}

const EMPTY_FORM: FormState = {
  companyId: "",
  templateId: "",
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  repNome: "",
  repNacionalidade: "Brasileiro(a)",
  repEstadoCivil: "",
  repProfissao: "",
  repRg: "",
  repCpf: "",
  quantidadeVidas: "",
  dataInicio: new Date().toISOString().slice(0, 10),
  prazoMeses: "12",
  valorMensalidade: "",
  valorPrimeiraParcela: "",
  dataVencimentoPrimeiraParcela: "",
  diaVencimentoMensal: "10",
  formaPagamento: "Boleto bancário",
  qtdVisitas: "",
  frequenciaVisitas: "trimestrais",
  observacoes: "",
};

function contractToForm(c: ContractDetail): FormState {
  return {
    companyId: c.companyId ?? "",
    templateId: c.templateId,
    razaoSocial: c.razaoSocial,
    nomeFantasia: c.nomeFantasia ?? "",
    cnpj: c.cnpj,
    cep: c.cep ?? "",
    endereco: c.endereco ?? "",
    numero: c.numero ?? "",
    complemento: c.complemento ?? "",
    bairro: c.bairro ?? "",
    cidade: c.cidade ?? "",
    estado: c.estado ?? "",
    repNome: c.repNome,
    repNacionalidade: c.repNacionalidade ?? "",
    repEstadoCivil: c.repEstadoCivil ?? "",
    repProfissao: c.repProfissao ?? "",
    repRg: c.repRg ?? "",
    repCpf: c.repCpf ?? "",
    quantidadeVidas: c.quantidadeVidas != null ? String(c.quantidadeVidas) : "",
    dataInicio: c.dataInicio.slice(0, 10),
    prazoMeses: String(c.prazoMeses),
    valorMensalidade: String(c.valorMensalidade),
    valorPrimeiraParcela: c.valorPrimeiraParcela != null ? String(c.valorPrimeiraParcela) : "",
    dataVencimentoPrimeiraParcela: c.dataVencimentoPrimeiraParcela ? c.dataVencimentoPrimeiraParcela.slice(0, 10) : "",
    diaVencimentoMensal: c.diaVencimentoMensal != null ? String(c.diaVencimentoMensal) : "",
    formaPagamento: c.formaPagamento ?? "",
    qtdVisitas: c.qtdVisitas != null ? String(c.qtdVisitas) : "",
    frequenciaVisitas: c.frequenciaVisitas ?? "",
    observacoes: c.observacoes ?? "",
  };
}

export function NewContractTab({
  editingContractId,
  onFinished,
}: {
  editingContractId?: string | null;
  onFinished: () => void;
}) {
  const [step, setStep] = useState<Step>("form");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [contractId, setContractId] = useState<string | null>(null);
  const [preview, setPreview] = useState<ContractPreview | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.get<Company[]>("/companies"), api.get<ContractTemplate[]>("/contracts/templates")]).then(
      ([companyList, templateList]) => {
        setCompanies(companyList);
        setTemplates(templateList);
        if (!editingContractId && templateList[0]) {
          setForm((f) => ({ ...f, templateId: templateList[0]!.id }));
          setSelectedServiceIds(new Set(templateList[0]!.serviceItems.map((s) => s.id)));
        }
      },
    );
  }, [editingContractId]);

  useEffect(() => {
    if (!editingContractId) return;
    api.get<ContractDetail>(`/contracts/${editingContractId}`).then((c) => {
      setContractId(c.id);
      setForm(contractToForm(c));
      setSelectedServiceIds(new Set((c.services ?? []).map((s) => s.serviceItemId)));
      setPdfUrl(c.pdfUrl);
    });
  }, [editingContractId]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSelectCompany(companyId: string) {
    set("companyId", companyId);
    const company = companies.find((c) => c.id === companyId);
    if (!company) return;
    setForm((f) => ({
      ...f,
      companyId,
      razaoSocial: company.legalName ?? company.name,
      nomeFantasia: company.name,
      cnpj: company.cnpj ?? f.cnpj,
      cep: company.cep ?? f.cep,
      endereco: company.endereco ?? f.endereco,
      numero: company.numero ?? f.numero,
      complemento: company.complemento ?? f.complemento,
      bairro: company.bairro ?? f.bairro,
      cidade: company.cidade ?? f.cidade,
      estado: company.estado ?? f.estado,
    }));
  }

  function toggleService(id: string) {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function buildPayload() {
    return {
      companyId: form.companyId || undefined,
      templateId: form.templateId,
      razaoSocial: form.razaoSocial,
      nomeFantasia: form.nomeFantasia || undefined,
      cnpj: form.cnpj,
      cep: form.cep || undefined,
      endereco: form.endereco || undefined,
      numero: form.numero || undefined,
      complemento: form.complemento || undefined,
      bairro: form.bairro || undefined,
      cidade: form.cidade || undefined,
      estado: form.estado || undefined,
      repNome: form.repNome,
      repNacionalidade: form.repNacionalidade || undefined,
      repEstadoCivil: form.repEstadoCivil || undefined,
      repProfissao: form.repProfissao || undefined,
      repRg: form.repRg || undefined,
      repCpf: form.repCpf || undefined,
      quantidadeVidas: form.quantidadeVidas ? Number(form.quantidadeVidas) : undefined,
      dataInicio: form.dataInicio,
      prazoMeses: form.prazoMeses ? Number(form.prazoMeses) : undefined,
      valorMensalidade: Number(form.valorMensalidade),
      valorPrimeiraParcela: form.valorPrimeiraParcela ? Number(form.valorPrimeiraParcela) : undefined,
      dataVencimentoPrimeiraParcela: form.dataVencimentoPrimeiraParcela || undefined,
      diaVencimentoMensal: form.diaVencimentoMensal ? Number(form.diaVencimentoMensal) : undefined,
      formaPagamento: form.formaPagamento || undefined,
      qtdVisitas: form.qtdVisitas ? Number(form.qtdVisitas) : undefined,
      frequenciaVisitas: form.frequenciaVisitas || undefined,
      observacoes: form.observacoes || undefined,
      serviceItemIds: Array.from(selectedServiceIds),
    };
  }

  async function handleVisualizar() {
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload();
      const saved: Contract = contractId
        ? await api.patch(`/contracts/${contractId}`, payload)
        : await api.post("/contracts", payload);
      setContractId(saved.id);
      const p = await api.get<ContractPreview>(`/contracts/${saved.id}/preview`);
      setPreview(p);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar contrato.");
    } finally {
      setSaving(false);
    }
  }

  async function handleGerarPdf() {
    if (!contractId) return;
    setSaving(true);
    try {
      const updated = await api.post<Contract>(`/contracts/${contractId}/pdf`, {});
      setPdfUrl(updated.pdfUrl);
      setStep("done");
    } finally {
      setSaving(false);
    }
  }

  if (step === "preview" && preview) {
    return (
      <div className="max-w-3xl">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-medium text-ink">
            <Eye size={15} /> Prévia do contrato
          </p>
          <div className="flex gap-2">
            <button onClick={() => setStep("form")} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Pencil size={13} /> Editar Dados
            </button>
            <button onClick={handleGerarPdf} disabled={saving} className="btn-primary flex items-center gap-1.5 text-sm">
              <FileDown size={13} /> {saving ? "Gerando…" : "Gerar PDF"}
            </button>
          </div>
        </div>

        <div className="card mt-4 max-h-[70vh] overflow-y-auto">
          <h2 className="text-center font-display text-lg font-semibold text-ink">{preview.templateName}</h2>
          {preview.clauses.map((clause, i) => (
            <div key={i} className="mt-4">
              {clause.title && <p className="font-semibold text-ink">{clause.title}</p>}
              <p className="mt-1 whitespace-pre-line text-sm text-ink-muted">{clause.body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="card flex max-w-md flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 size={32} className="text-teal-deep" />
        <p className="font-medium text-ink">PDF gerado com sucesso!</p>
        {pdfUrl && (
          <a href={pdfUrl} target="_blank" rel="noreferrer" className="btn-primary flex items-center gap-1.5">
            <FileDown size={14} /> Baixar PDF
          </a>
        )}
        <button className="btn-secondary" onClick={onFinished}>Ver contratos cadastrados</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="card flex flex-col gap-5">
        <section>
          <h3 className="font-medium text-ink">Empresa (CONTRATANTE)</h3>
          <div className="mt-2 flex flex-wrap gap-3">
            <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm">
              <span className="text-ink-muted">Empresa já cadastrada (opcional)</span>
              <select className="input" value={form.companyId} onChange={(e) => handleSelectCompany(e.target.value)}>
                <option value="">— Digitar manualmente —</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Modelo de contrato</span>
              <select className="input" value={form.templateId} onChange={(e) => set("templateId", e.target.value)}>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm">
              <span className="text-ink-muted">Razão Social</span>
              <input className="input" value={form.razaoSocial} onChange={(e) => set("razaoSocial", e.target.value)} required />
            </label>
            <label className="flex min-w-[180px] flex-col gap-1 text-sm">
              <span className="text-ink-muted">Nome Fantasia</span>
              <input className="input" value={form.nomeFantasia} onChange={(e) => set("nomeFantasia", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">CNPJ</span>
              <input className="input" value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} required />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">CEP</span>
              <input className="input w-32" value={form.cep} onChange={(e) => set("cep", e.target.value)} />
            </label>
            <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm">
              <span className="text-ink-muted">Endereço</span>
              <input className="input" value={form.endereco} onChange={(e) => set("endereco", e.target.value)} />
            </label>
            <label className="flex w-24 flex-col gap-1 text-sm">
              <span className="text-ink-muted">Número</span>
              <input className="input" value={form.numero} onChange={(e) => set("numero", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Complemento</span>
              <input className="input" value={form.complemento} onChange={(e) => set("complemento", e.target.value)} />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Bairro</span>
              <input className="input" value={form.bairro} onChange={(e) => set("bairro", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Cidade</span>
              <input className="input" value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Estado</span>
              <input className="input w-24" value={form.estado} onChange={(e) => set("estado", e.target.value)} />
            </label>
          </div>
        </section>

        <section className="border-t border-line pt-4">
          <h3 className="font-medium text-ink">Representante legal</h3>
          <div className="mt-2 flex flex-wrap gap-3">
            <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm">
              <span className="text-ink-muted">Nome completo</span>
              <input className="input" value={form.repNome} onChange={(e) => set("repNome", e.target.value)} required />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Nacionalidade</span>
              <input className="input" value={form.repNacionalidade} onChange={(e) => set("repNacionalidade", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Estado civil</span>
              <input className="input" value={form.repEstadoCivil} onChange={(e) => set("repEstadoCivil", e.target.value)} />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-sm">
              <span className="text-ink-muted">Profissão / Cargo</span>
              <input className="input" value={form.repProfissao} onChange={(e) => set("repProfissao", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">RG</span>
              <input className="input" value={form.repRg} onChange={(e) => set("repRg", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">CPF</span>
              <input className="input" value={form.repCpf} onChange={(e) => set("repCpf", e.target.value)} />
            </label>
          </div>
        </section>

        <section className="border-t border-line pt-4">
          <h3 className="font-medium text-ink">Termos do contrato</h3>
          <div className="mt-2 flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Vidas (colaboradores)</span>
              <input type="number" className="input w-28" value={form.quantidadeVidas} onChange={(e) => set("quantidadeVidas", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Início do contrato</span>
              <input type="date" className="input" value={form.dataInicio} onChange={(e) => set("dataInicio", e.target.value)} required />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Prazo (meses)</span>
              <input type="number" className="input w-24" value={form.prazoMeses} onChange={(e) => set("prazoMeses", e.target.value)} />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Valor da mensalidade (R$)</span>
              <input type="number" step="0.01" className="input w-36" value={form.valorMensalidade} onChange={(e) => set("valorMensalidade", e.target.value)} required />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">1ª parcela, se diferente (R$)</span>
              <input type="number" step="0.01" className="input w-36" value={form.valorPrimeiraParcela} onChange={(e) => set("valorPrimeiraParcela", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Vencimento 1ª parcela</span>
              <input type="date" className="input" value={form.dataVencimentoPrimeiraParcela} onChange={(e) => set("dataVencimentoPrimeiraParcela", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Dia do vencimento mensal</span>
              <input type="number" className="input w-24" value={form.diaVencimentoMensal} onChange={(e) => set("diaVencimentoMensal", e.target.value)} />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm">
              <span className="text-ink-muted">Forma de pagamento</span>
              <input className="input" value={form.formaPagamento} onChange={(e) => set("formaPagamento", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Qtd. de visitas</span>
              <input type="number" className="input w-24" value={form.qtdVisitas} onChange={(e) => set("qtdVisitas", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Frequência das visitas</span>
              <input className="input" value={form.frequenciaVisitas} onChange={(e) => set("frequenciaVisitas", e.target.value)} placeholder="trimestrais" />
            </label>
          </div>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Outras informações específicas do contrato</span>
            <textarea className="input" rows={2} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
          </label>
        </section>

        <section className="border-t border-line pt-4">
          <h3 className="font-medium text-ink">Serviços contratados</h3>
          <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {templates
              .find((t) => t.id === form.templateId)
              ?.serviceItems.map((item) => (
                <label key={item.id} className="flex items-start gap-2 text-sm text-ink-muted">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={selectedServiceIds.has(item.id)}
                    onChange={() => toggleService(item.id)}
                  />
                  {item.text.replace(/\{\{[^}]+\}\}/g, "…")}
                </label>
              ))}
          </div>
        </section>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          onClick={handleVisualizar}
          disabled={saving || !form.razaoSocial || !form.cnpj || !form.repNome || !form.valorMensalidade}
          className="btn-primary flex w-fit items-center gap-1.5"
        >
          <Eye size={15} /> {saving ? "Salvando…" : "Visualizar Contrato"}
        </button>
      </div>
    </div>
  );
}
