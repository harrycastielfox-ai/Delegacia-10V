import { CheckCircle2, Clock3, Crosshair, MapPin, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  getDiligenciaById,
  listDiligenciasPage,
  registrarChegada,
} from "@/lib/repositories/localizacaoRepository";
import type { ChegadaRecord, DiligenciaDetalhe, DiligenciaListRecord } from "../localizacaoTypes";

type ArrivalItem = {
  diligence: DiligenciaListRecord;
  arrival: ChegadaRecord | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(
    new Date(value),
  );
}

export default function ChegadasPage() {
  const [diligencias, setDiligencias] = useState<DiligenciaListRecord[]>([]);
  const [details, setDetails] = useState<Record<string, DiligenciaDetalhe | null>>({});
  const [newArrivals, setNewArrivals] = useState<Record<string, ChegadaRecord>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [diligenciaId, setDiligenciaId] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [accuracy, setAccuracy] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listDiligenciasPage({ pageSize: 100 }).then(async (records) => {
      if (cancelled) return;
      setDiligencias(records);
      const arrivals = records.filter((item) => item.chegada_em);
      const resolved = await Promise.all(
        arrivals.map(async (item) => [item.id, await getDiligenciaById(item.id)] as const),
      );
      if (!cancelled) setDetails(Object.fromEntries(resolved));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const arrivalItems = useMemo<ArrivalItem[]>(
    () =>
      diligencias
        .filter((item) => item.chegada_em || newArrivals[item.id])
        .map((diligence) => ({
          diligence,
          arrival: newArrivals[diligence.id] ?? details[diligence.id]?.chegada ?? null,
        }))
        .sort((a, b) =>
          (b.arrival?.registrada_em ?? b.diligence.chegada_em ?? "").localeCompare(
            a.arrival?.registrada_em ?? a.diligence.chegada_em ?? "",
          ),
        ),
    [details, diligencias, newArrivals],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!diligenciaId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setMessage("Selecione a diligência e informe coordenadas válidas.");
      return;
    }
    setSaving(true);
    try {
      const arrival = await registrarChegada({
        diligencia_id: diligenciaId,
        latitude: lat,
        longitude: lng,
        precisao_metros: accuracy ? Number(accuracy) : null,
        observacoes: notes.trim() || null,
      });
      setNewArrivals((current) => ({ ...current, [diligenciaId]: arrival }));
      setMessage("Chegada registrada com sucesso.");
      setFormOpen(false);
      setDiligenciaId("");
      setLatitude("");
      setLongitude("");
      setAccuracy("");
      setNotes("");
    } catch (error) {
      console.error("[ChegadasPage] Falha ao registrar chegada", error);
      setMessage("Não foi possível registrar a chegada.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-operational">
            Controle de presença
          </p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Chegadas ao local</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Horário e posição confirmados pelas equipes em campo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setFormOpen(true);
          }}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-operational px-4 py-2.5 text-sm font-bold text-[var(--operational-contrast)]"
        >
          <Plus className="h-4 w-4" /> Registrar chegada
        </button>
      </header>

      {message ? (
        <div className="mb-4 rounded-lg border border-operational/35 bg-operational/10 p-3 text-sm text-foreground">
          {message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Diligência</th>
                <th className="px-4 py-3">Destino</th>
                <th className="px-4 py-3">Horário</th>
                <th className="px-4 py-3">Coordenada</th>
                <th className="px-4 py-3">Precisão</th>
                <th className="px-4 py-3">Registrado por</th>
              </tr>
            </thead>
            <tbody>
              {arrivalItems.map(({ diligence, arrival }) => {
                const registeredAt = arrival?.registrada_em ?? diligence.chegada_em;
                return (
                  <tr key={diligence.id} className="border-b border-border text-xs last:border-b-0">
                    <td className="px-5 py-4 font-mono font-bold text-operational">
                      {diligence.codigo}
                    </td>
                    <td className="px-4 py-4 text-foreground">{diligence.destino}</td>
                    <td className="px-4 py-4 text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        {registeredAt ? formatDate(registeredAt) : "Não informado"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-foreground">
                      {arrival
                        ? `${arrival.latitude.toFixed(6)}, ${arrival.longitude.toFixed(6)}`
                        : "Não informada"}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {arrival?.precisao_metros !== null && arrival?.precisao_metros !== undefined
                        ? `${arrival.precisao_metros} m`
                        : "Não informada"}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {arrival?.registrada_por ?? "Não informado"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!arrivalItems.length ? (
          <div className="flex min-h-52 flex-col items-center justify-center p-6 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 text-sm font-bold">Nenhuma chegada registrada</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              As confirmações das equipes aparecerão nesta lista.
            </p>
          </div>
        ) : null}
      </section>

      {formOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-operational/35 bg-card p-5 shadow-[0_0_50px_color-mix(in_oklab,var(--operational)_16%,transparent)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-operational">
                  Confirmação manual
                </p>
                <h2 className="mt-1 text-xl font-black">Registrar chegada</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  A captura automática de GPS poderá preencher estes dados depois.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Diligência
                </span>
                <select
                  value={diligenciaId}
                  onChange={(event) => setDiligenciaId(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  required
                >
                  <option value="">Selecione</option>
                  {diligencias.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.codigo} — {item.destino}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Latitude
                </span>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  required
                />
              </label>
              <label>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Longitude
                </span>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  required
                />
              </label>
              <label>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Precisão (m)
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={accuracy}
                  onChange={(event) => setAccuracy(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Observações
                </span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-operational px-4 text-sm font-black text-[var(--operational-contrast)] disabled:opacity-60"
            >
              {saving ? (
                <Crosshair className="h-4 w-4 animate-pulse" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {saving ? "Registrando..." : "Confirmar chegada"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
