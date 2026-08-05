import { Camera, CheckCircle2, LoaderCircle, Navigation } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { AccessContextError, requestPreciseLocation } from "@/lib/accessContext";
import { buildMapDirectionsUrl } from "@/lib/mapLinks";
import { registrarChegada, uploadFotosDiligencia } from "@/lib/repositories/localizacaoRepository";
import type { DiligenciaListRecord } from "../localizacaoTypes";

type BusyAction = "arrival" | "photos" | null;

function arrivalErrorMessage(error: unknown) {
  if (error instanceof AccessContextError) {
    if (error.code === "PERMISSION_DENIED") return "Ative a permissão de localização do tablet.";
    if (error.code === "TIMEOUT") return "O GPS demorou a responder. Tente novamente.";
    if (error.code === "POSITION_UNAVAILABLE") return "O tablet não conseguiu obter a posição.";
  }
  return "Não foi possível confirmar a chegada.";
}

export function TabletViaturaActions({
  diligencia,
  onArrivalConfirmed,
}: {
  diligencia: DiligenciaListRecord | null;
  onArrivalConfirmed: (registeredAt: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "erro"; text: string } | null>(null);

  const directionsUrl = useMemo(
    () =>
      diligencia
        ? buildMapDirectionsUrl({
            endereco: diligencia.destino,
            latitude: diligencia.latitude,
            longitude: diligencia.longitude,
          })
        : null,
    [diligencia],
  );

  const arrivalAlreadyRegistered =
    diligencia?.status === "no_local" || diligencia?.status === "concluida";

  async function confirmArrival() {
    if (!diligencia || busy || arrivalAlreadyRegistered) return;
    setBusy("arrival");
    setMessage(null);
    try {
      const position = await requestPreciseLocation();
      await registrarChegada({
        diligencia_id: diligencia.id,
        latitude: position.latitude,
        longitude: position.longitude,
        precisao_metros: position.accuracyMeters,
        observacoes: null,
      });
      const registeredAt = new Date().toISOString();
      onArrivalConfirmed(registeredAt);
      setMessage({ kind: "ok", text: "Chegada confirmada pelo GPS do tablet." });
    } catch (error) {
      console.error("[TabletViaturaActions] Falha ao registrar chegada", error);
      setMessage({ kind: "erro", text: arrivalErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  async function uploadPhotos(files: File[]) {
    if (!diligencia || !files.length || busy) return;
    setBusy("photos");
    setMessage(null);
    try {
      await uploadFotosDiligencia(diligencia.id, files);
      setMessage({
        kind: "ok",
        text: files.length === 1 ? "Foto anexada à diligência." : `${files.length} fotos anexadas.`,
      });
    } catch (error) {
      console.error("[TabletViaturaActions] Falha ao enviar fotos", error);
      setMessage({ kind: "erro", text: "Não foi possível anexar as fotos." });
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="localizacao-viatura-actions hidden" aria-label="Ações rápidas da viatura">
      {message ? (
        <p
          role="status"
          aria-live="polite"
          className={`localizacao-viatura-toast ${
            message.kind === "erro"
              ? "border-destructive/50 bg-destructive text-destructive-foreground"
              : "border-success/50 bg-success text-background"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {directionsUrl ? (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="localizacao-viatura-action bg-operational text-[var(--operational-contrast)]"
        >
          <Navigation className="h-5 w-5" />
          <span>Navegar</span>
        </a>
      ) : (
        <button type="button" disabled className="localizacao-viatura-action border border-border">
          <Navigation className="h-5 w-5" />
          <span>Navegar</span>
        </button>
      )}

      <button
        type="button"
        onClick={confirmArrival}
        disabled={!diligencia || busy !== null || arrivalAlreadyRegistered}
        className="localizacao-viatura-action border border-success/50 bg-success/15 text-success"
      >
        {busy === "arrival" ? (
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-5 w-5" />
        )}
        <span>{arrivalAlreadyRegistered ? "No local" : "Cheguei"}</span>
      </button>

      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={!diligencia || busy !== null}
        className="localizacao-viatura-action border border-border bg-card text-foreground"
      >
        {busy === "photos" ? (
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : (
          <Camera className="h-5 w-5 text-operational" />
        )}
        <span>Registrar foto</span>
      </button>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={(event) => void uploadPhotos(Array.from(event.target.files ?? []))}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
