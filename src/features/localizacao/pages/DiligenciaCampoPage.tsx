import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Camera, CheckCircle2, MapPin, Save, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AbrirNoMapa } from "@/components/AbrirNoMapa";
import { AccessContextError, requestPreciseLocation } from "@/lib/accessContext";
import {
  getDiligenciaById,
  registrarChegada,
  updateDiligencia,
  uploadFotosDiligencia,
} from "@/lib/repositories/localizacaoRepository";
import type { DiligenciaDetalhe } from "../localizacaoTypes";
import { DiligenciaStatusBadge } from "../components/DiligenciaStatusBadge";

/** Em campo, a mensagem precisa dizer o que fazer, não só que deu errado. */
function mensagemDeErroDeLocalizacao(error: unknown) {
  if (error instanceof AccessContextError) {
    if (error.code === "PERMISSION_DENIED")
      return "Permita o acesso à localização nas configurações do navegador para confirmar a chegada.";
    if (error.code === "TIMEOUT")
      return "O GPS demorou a responder. Vá para um ponto aberto e tente de novo.";
    if (error.code === "POSITION_UNAVAILABLE")
      return "Não foi possível obter a localização neste aparelho.";
  }
  return "Não foi possível registrar a chegada.";
}

export default function DiligenciaCampoPage() {
  const { diligenciaId } = useParams({ strict: false }) as { diligenciaId: string };
  const [diligencia, setDiligencia] = useState<DiligenciaDetalhe | null>(null);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState<"arrival" | "photos" | "notes" | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "erro"; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void getDiligenciaById(diligenciaId).then((record) => {
      if (!cancelled) {
        setDiligencia(record);
        setNotes(record?.observacoes ?? "");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [diligenciaId]);

  async function confirmArrival() {
    setMessage(null);
    setBusy("arrival");
    try {
      // Reaproveita o wrapper do SIPI: já traz erro tipado (permissão, tempo, indisponível).
      const posicao = await requestPreciseLocation();
      await registrarChegada({
        diligencia_id: diligenciaId,
        latitude: posicao.latitude,
        longitude: posicao.longitude,
        precisao_metros: posicao.accuracyMeters,
        observacoes: notes.trim() || null,
      });
      setDiligencia((current) =>
        current
          ? { ...current, status: "no_local", chegada_em: new Date().toISOString() }
          : current,
      );
      const precisao = posicao.accuracyMeters
        ? ` Precisão de ${Math.round(posicao.accuracyMeters)} m.`
        : "";
      setMessage({ kind: "ok", text: `Chegada confirmada com a posição do aparelho.${precisao}` });
    } catch (error) {
      console.error("[DiligenciaCampoPage] Falha ao registrar chegada", error);
      setMessage({ kind: "erro", text: mensagemDeErroDeLocalizacao(error) });
    } finally {
      setBusy(null);
    }
  }

  async function uploadPhotos() {
    if (!files.length) return;
    setBusy("photos");
    setMessage(null);
    try {
      await uploadFotosDiligencia(diligenciaId, files);
      setMessage({ kind: "ok", text: `${files.length} foto(s) enviada(s) para a diligência.` });
      setFiles([]);
      if (fileInput.current) fileInput.current.value = "";
    } catch (error) {
      console.error("[DiligenciaCampoPage] Falha ao enviar fotos", error);
      setMessage({ kind: "erro", text: "Não foi possível enviar as fotos." });
    } finally {
      setBusy(null);
    }
  }

  async function saveNotes() {
    setBusy("notes");
    setMessage(null);
    try {
      await updateDiligencia(diligenciaId, { observacoes: notes.trim() || null });
      setMessage({ kind: "ok", text: "Observações salvas." });
    } catch (error) {
      console.error("[DiligenciaCampoPage] Falha ao salvar observações", error);
      setMessage({ kind: "erro", text: "Não foi possível salvar as observações." });
    } finally {
      setBusy(null);
    }
  }

  if (!diligencia) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">Carregando missão...</div>
    );
  }

  const address = diligencia.endereco;
  const destination = address
    ? `${address.logradouro}, ${address.sem_numero ? "s/n" : (address.numero ?? "s/n")}`
    : "Endereço não informado";

  return (
    <div className="mx-auto w-full max-w-md">
      <Link
        to="/localizacao/diligencias/$diligenciaId"
        params={{ diligenciaId }}
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted-foreground"
      >
        <ArrowLeft className="h-5 w-5" /> Voltar ao detalhe
      </Link>

      <section className="overflow-hidden rounded-2xl border border-operational/40 bg-card shadow-[0_0_28px_color-mix(in_oklab,var(--operational)_14%,transparent)]">
        <header className="border-b border-border bg-operational/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-sm font-black text-operational">
              {diligencia.codigo}
            </span>
            <DiligenciaStatusBadge status={diligencia.status} />
          </div>
          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Destino da diligência
          </p>
          <h1 className="mt-2 text-2xl font-black leading-tight">{destination}</h1>
          <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-operational" />
            {[address?.bairro, address?.ponto_referencia].filter(Boolean).join(" · ") ||
              "Sem referência adicional"}
          </p>
        </header>

        <div className="space-y-4 p-4">
          <section className="rounded-xl border border-border bg-background p-4">
            <h2 className="text-sm font-black">Navegar até o local</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Abra a rota no aplicativo de mapas do aparelho.
            </p>
            <AbrirNoMapa
              urlManual={address?.maps_url}
              className="mt-3 [&_a]:min-h-14 [&_a]:flex-1 [&_a]:justify-center [&_a]:text-sm"
              size="md"
              mostrarStreetView={false}
              target={{
                endereco: address ? destination : null,
                latitude: address?.latitude,
                longitude: address?.longitude,
              }}
            />
          </section>

          <button
            type="button"
            onClick={confirmArrival}
            disabled={busy !== null || diligencia.status === "no_local"}
            className="flex min-h-16 w-full items-center justify-center gap-3 rounded-xl bg-success px-5 text-base font-black text-background shadow-[0_0_22px_color-mix(in_oklab,var(--success)_22%,transparent)] disabled:opacity-60"
          >
            <CheckCircle2 className="h-6 w-6" />
            {diligencia.status === "no_local"
              ? "Chegada já confirmada"
              : busy === "arrival"
                ? "Obtendo localização..."
                : "Cheguei ao local"}
          </button>

          <section className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-operational/30 bg-operational/10 text-operational">
                <Camera className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-black">Fotos da diligência</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Fotografe o local ou selecione imagens do aparelho.
                </p>
              </div>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              className="mt-4 block w-full text-sm text-muted-foreground file:mr-3 file:min-h-12 file:rounded-lg file:border file:border-operational/40 file:bg-operational/10 file:px-4 file:text-sm file:font-bold file:text-operational"
            />
            {files.length ? (
              <button
                type="button"
                onClick={uploadPhotos}
                disabled={busy !== null}
                className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-operational/40 bg-operational/10 px-4 text-sm font-bold text-operational disabled:opacity-60"
              >
                <Upload className="h-5 w-5" />
                {busy === "photos" ? "Enviando..." : `Enviar ${files.length} foto(s)`}
              </button>
            ) : null}
          </section>

          <section className="rounded-xl border border-border bg-background p-4">
            <label className="text-sm font-black" htmlFor="field-notes">
              Observações de campo
            </label>
            <textarea
              id="field-notes"
              rows={5}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Registre o que foi encontrado no local"
              className="mt-3 w-full rounded-lg border border-border bg-card p-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-operational/50"
            />
            <button
              type="button"
              onClick={saveNotes}
              disabled={busy !== null}
              className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-bold hover:bg-accent disabled:opacity-60"
            >
              <Save className="h-5 w-5" /> {busy === "notes" ? "Salvando..." : "Salvar observações"}
            </button>
          </section>

          {message ? (
            <p
              role="status"
              aria-live="polite"
              className={`rounded-lg p-3 text-sm font-semibold ${
                message.kind === "erro"
                  ? "border border-destructive/40 bg-destructive/10 text-destructive"
                  : "border border-success/40 bg-success/10 text-success"
              }`}
            >
              {message.text}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
