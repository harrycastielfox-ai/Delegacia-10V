import { AlertTriangle, CheckCircle2, CircleDot, ClipboardCheck } from "lucide-react";
import type { RegistrationCheck } from "@/lib/operationalContracts";

type RegistrationQualityPanelProps = {
  checks: RegistrationCheck[];
};

export function RegistrationQualityPanel({ checks }: RegistrationQualityPanelProps) {
  const completed = checks.filter((item) => item.complete).length;
  const pending = checks.filter((item) => !item.complete);
  const blocking = pending.filter((item) => item.blocking);
  const recommended = pending.filter((item) => !item.blocking);
  const progress = checks.length > 0 ? Math.round((completed / checks.length) * 100) : 100;

  if (pending.length === 0) return null;

  const status =
    blocking.length > 0
      ? `${blocking.length} obrigatóri${blocking.length === 1 ? "a" : "as"}`
      : pending.length > 0
        ? `${recommended.length} recomendaç${recommended.length === 1 ? "ão" : "ões"}`
        : "Cadastro completo";

  const progressTone =
    blocking.length > 0 ? "bg-destructive" : pending.length > 0 ? "bg-amber-400" : "bg-primary";

  return (
    <section
      aria-live="polite"
      className="rounded-lg border border-primary/25 bg-card/45 px-4 py-4 sm:px-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
            <ClipboardCheck className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-foreground">Integridade do cadastro</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {blocking.length > 0
                ? "Ainda faltam informações obrigatórias para salvar com segurança."
                : pending.length > 0
                  ? "O cadastro pode ser salvo, mas ainda faltam informações recomendadas."
                  : "Todos os campos acompanhados estão preenchidos e consistentes."}
            </p>
          </div>
        </div>

        <span
          className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            blocking.length > 0
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : pending.length > 0
                ? "border-amber-400/35 bg-amber-400/10 text-amber-300"
                : "border-primary/30 bg-primary/10 text-primary"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Completude
        </span>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted/70">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${progressTone}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span
          className={`min-w-10 text-right text-xs font-bold ${
            blocking.length > 0
              ? "text-destructive"
              : pending.length > 0
                ? "text-amber-300"
                : "text-primary"
          }`}
        >
          {progress}%
        </span>
      </div>

      {pending.length > 0 ? (
        <div className="mt-4 grid gap-x-6 gap-y-2 md:grid-cols-2">
          {pending.slice(0, 6).map((item) => (
            <div key={item.id} className="flex min-w-0 items-start gap-2 text-xs">
              {item.blocking ? (
                <AlertTriangle
                  className="mt-0.5 size-3.5 shrink-0 text-destructive"
                  aria-hidden="true"
                />
              ) : (
                <CircleDot
                  className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              <span className={item.blocking ? "text-destructive" : "text-muted-foreground"}>
                {item.label}
              </span>
            </div>
          ))}
          {pending.length > 6 && (
            <p className="text-xs text-muted-foreground">
              Mais {pending.length - 6} recomendaç{pending.length - 6 === 1 ? "ão" : "ões"} no
              formulário.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 text-xs text-primary">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          <span>Os campos acompanhados estão consistentes.</span>
        </div>
      )}
    </section>
  );
}
