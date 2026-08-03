import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import {
  createDiligencia,
  getDiligenciaById,
  updateDiligencia,
} from "@/lib/repositories/localizacaoRepository";
import { DILIGENCIA_STATUS_LABELS, DILIGENCIA_TIPO_LABELS } from "../localizacaoConstants";
import type {
  DiligenciaPayload,
  DiligenciaRecord,
  DiligenciaStatus,
  DiligenciaTipo,
} from "../localizacaoTypes";
import { EnderecoPicker } from "../components/EnderecoPicker";
import { PessoaPicker } from "../components/PessoaPicker";

const fieldClass =
  "mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-operational/50";

export default function DiligenciaFormPage({ mode }: { mode: "create" | "edit" }) {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { diligenciaId?: string };
  const [tipo, setTipo] = useState<DiligenciaTipo | "">("");
  const [status, setStatus] = useState<DiligenciaStatus>("planejada");
  const [enderecoId, setEnderecoId] = useState<string | null>(null);
  const [pessoaId, setPessoaId] = useState<string | null>(null);
  const [equipeNome, setEquipeNome] = useState("");
  const [equipeAgentes, setEquipeAgentes] = useState("");
  const [viatura, setViatura] = useState("");
  const [agendadaPara, setAgendadaPara] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(mode === "edit");
  const [original, setOriginal] = useState<DiligenciaRecord | null>(null);

  useEffect(() => {
    if (mode !== "edit" || !params.diligenciaId) return;
    let cancelled = false;
    void getDiligenciaById(params.diligenciaId).then((record) => {
      if (cancelled) return;
      if (!record) {
        setError("Diligência não encontrada.");
        setLoading(false);
        return;
      }
      setTipo(record.tipo);
      setOriginal(record);
      setStatus(record.status);
      setEnderecoId(record.endereco_id);
      setPessoaId(record.pessoa_id);
      setEquipeNome(record.equipe_nome ?? "");
      setEquipeAgentes(record.equipe_agentes?.toString() ?? "");
      setViatura(record.viatura ?? "");
      setAgendadaPara(record.agendada_para?.slice(0, 16) ?? "");
      setObservacoes(record.observacoes ?? "");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [mode, params.diligenciaId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!tipo) {
      setError("Selecione o tipo da diligência.");
      return;
    }
    if (!enderecoId) {
      setError("Selecione o endereço da diligência.");
      return;
    }

    const payload: DiligenciaPayload = {
      tipo,
      status,
      endereco_id: enderecoId,
      pessoa_id: pessoaId,
      inquerito_id: null,
      veiculo_id: null,
      equipe_nome: equipeNome.trim() || null,
      equipe_agentes: equipeAgentes ? Number(equipeAgentes) : null,
      viatura: viatura.trim() || null,
      agendada_para: agendadaPara ? new Date(agendadaPara).toISOString() : null,
      saida_em: mode === "edit" ? (original?.saida_em ?? null) : null,
      chegada_em: mode === "edit" ? (original?.chegada_em ?? null) : null,
      concluida_em: mode === "edit" ? (original?.concluida_em ?? null) : null,
      distancia_metros: mode === "edit" ? (original?.distancia_metros ?? null) : null,
      duracao_segundos: mode === "edit" ? (original?.duracao_segundos ?? null) : null,
      resultado: mode === "edit" ? (original?.resultado ?? null) : null,
      observacoes: observacoes.trim() || null,
    };

    setSaving(true);
    try {
      const saved =
        mode === "edit" && params.diligenciaId
          ? await updateDiligencia(params.diligenciaId, payload)
          : await createDiligencia(payload);
      if (!saved) {
        setError("Não foi possível salvar a diligência.");
        return;
      }
      navigate({
        to: "/localizacao/diligencias/$diligenciaId",
        params: { diligenciaId: saved.id },
      });
    } catch (saveError) {
      console.error("[DiligenciaFormPage] Falha ao salvar", saveError);
      setError("Ocorreu um erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Carregando formulário...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to={mode === "edit" ? "/localizacao/diligencias/$diligenciaId" : "/localizacao/diligencias"}
        params={mode === "edit" && params.diligenciaId ? { diligenciaId: params.diligenciaId } : {}}
        className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-operational"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <header className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-operational">
          Planejamento operacional
        </p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">
          {mode === "edit" ? "Editar diligência" : "Nova diligência"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Defina destino, equipe e horário antes da saída.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-4 sm:p-6">
        {error ? (
          <div className="mb-5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tipo <span className="text-destructive">*</span>
            </label>
            <select
              value={tipo}
              onChange={(event) => setTipo(event.target.value as DiligenciaTipo | "")}
              className={fieldClass}
              required
            >
              <option value="">Selecione o tipo</option>
              {Object.entries(DILIGENCIA_TIPO_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {mode === "edit" ? (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Status
              </label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as DiligenciaStatus)}
                className={fieldClass}
              >
                {Object.entries(DILIGENCIA_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Agendamento
              </label>
              <input
                type="datetime-local"
                value={agendadaPara}
                onChange={(event) => setAgendadaPara(event.target.value)}
                className={fieldClass}
              />
            </div>
          )}
          <div className="lg:col-span-2">
            <EnderecoPicker value={enderecoId} onChange={setEnderecoId} required />
          </div>
          <div className="lg:col-span-2">
            <PessoaPicker value={pessoaId} onChange={setPessoaId} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Equipe
            </label>
            <input
              value={equipeNome}
              onChange={(event) => setEquipeNome(event.target.value)}
              placeholder="Ex.: Equipe Alfa-07"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Quantidade de agentes
            </label>
            <input
              type="number"
              min="1"
              value={equipeAgentes}
              onChange={(event) => setEquipeAgentes(event.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Viatura
            </label>
            <input
              value={viatura}
              onChange={(event) => setViatura(event.target.value)}
              placeholder="Ex.: VTR 02"
              className={fieldClass}
            />
          </div>
          {mode === "edit" ? (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Agendamento
              </label>
              <input
                type="datetime-local"
                value={agendadaPara}
                onChange={(event) => setAgendadaPara(event.target.value)}
                className={fieldClass}
              />
            </div>
          ) : null}
          <div className="lg:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Observações
            </label>
            <textarea
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              rows={4}
              placeholder="Orientações para a equipe em campo"
              className={`${fieldClass} py-3`}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Link
            to="/localizacao/diligencias"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-bold hover:bg-accent"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-operational px-5 py-2.5 text-sm font-bold text-[var(--operational-contrast)] hover:opacity-90 disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar diligência"}
          </button>
        </div>
      </form>
    </div>
  );
}
