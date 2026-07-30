import { Link } from "@tanstack/react-router";
import { Clock3, X } from "lucide-react";
import { useEffect, useState } from "react";
import { listInqueritos } from "@/lib/repositories/inqueritosRepository";
import { listRepresentacoes } from "@/lib/repositories/representacoesRepository";
import {
  daysUntilOperationalDate,
  isInqueritoEmAndamento,
  isRepresentacaoCumprida,
} from "@/lib/operationalMetrics";

const NEXT_CHECK_KEY = "sipi:due-soon-next-check-at";
const FIRST_CHECK_DELAY_MS = 20_000;
const REPEAT_INTERVAL_MS = 60 * 60 * 1000;
const AUTO_DISMISS_MS = 10_000;
const MIN_DAYS = 1;
const MAX_DAYS = 10;

type DueSoonItem = {
  id: string;
  kind: "inquerito" | "representacao";
  label: string;
  days: number;
};

function dayLabel(days: number) {
  return days === 1 ? "1 dia" : `${days} dias`;
}

function DueSoonRow({ item }: { item: DueSoonItem }) {
  const text = `${item.label} — vence em ${dayLabel(item.days)}`;
  const className = "block truncate transition-colors hover:text-red-400";

  if (item.kind === "inquerito") {
    return (
      <Link to="/inqueritos/$caseId" params={{ caseId: item.id }} className={className}>
        {text}
      </Link>
    );
  }

  return (
    <Link
      to="/representacoes/$representacaoId"
      params={{ representacaoId: item.id }}
      className={className}
    >
      {text}
    </Link>
  );
}

export function DueSoonNotification() {
  const [items, setItems] = useState<DueSoonItem[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timeoutId: number;

    function scheduleNextCheck() {
      let nextCheckAt = Number(sessionStorage.getItem(NEXT_CHECK_KEY));
      if (!nextCheckAt) {
        nextCheckAt = Date.now() + FIRST_CHECK_DELAY_MS;
        sessionStorage.setItem(NEXT_CHECK_KEY, String(nextCheckAt));
      }

      const remaining = Math.max(0, nextCheckAt - Date.now());
      timeoutId = window.setTimeout(() => {
        sessionStorage.setItem(NEXT_CHECK_KEY, String(Date.now() + REPEAT_INTERVAL_MS));
        void loadDueSoon();
        scheduleNextCheck();
      }, remaining);
    }

    scheduleNextCheck();
    return () => window.clearTimeout(timeoutId);
  }, []);

  async function loadDueSoon() {
    try {
      const [inqueritos, representacoes] = await Promise.all([
        listInqueritos(),
        listRepresentacoes(),
      ]);

      const dueSoon: DueSoonItem[] = [];

      inqueritos.forEach((item) => {
        if (!isInqueritoEmAndamento(item)) return;
        const days = daysUntilOperationalDate(item.prazo);
        if (days === null || days < MIN_DAYS || days > MAX_DAYS) return;
        dueSoon.push({
          id: item.id,
          kind: "inquerito",
          label: item.numero_ppe || item.codigo_interno || item.numero_fisico || "Inquérito",
          days,
        });
      });

      representacoes.forEach((item) => {
        if (isRepresentacaoCumprida(item)) return;
        const days = daysUntilOperationalDate(item.data_vencimento);
        if (days === null || days < MIN_DAYS || days > MAX_DAYS) return;
        dueSoon.push({
          id: item.id,
          kind: "representacao",
          label:
            item.numero_ppe || item.codigo_interno || item.processo_judicial || "Representação",
          days,
        });
      });

      if (dueSoon.length === 0) return;

      dueSoon.sort((a, b) => a.days - b.days);
      setItems(dueSoon);
      setVisible(true);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("[DueSoonNotification] falha ao carregar prazos", error);
      }
    }
  }

  useEffect(() => {
    if (!visible) return;
    const timeoutId = window.setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timeoutId);
  }, [visible]);

  if (!visible || items.length === 0) return null;

  const preview = items.slice(0, 3);
  const extra = items.length - preview.length;

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-in slide-in-from-bottom-4 fade-in fixed bottom-4 right-4 z-50 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-red-500/50 bg-card/95 p-4 shadow-[0_0_0_1px_rgba(239,68,68,0.25),0_0_32px_rgba(248,113,113,0.35),0_18px_45px_rgba(0,0,0,0.4)] duration-300"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/15 text-red-400 shadow-[0_0_14px_rgba(248,113,113,0.45)]">
          <Clock3 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.1em] text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.55)]">
            Prazos se aproximando
          </p>
          <p className="mt-1 text-sm text-foreground">
            {items.length} {items.length === 1 ? "procedimento vence" : "procedimentos vencem"}{" "}
            entre 1 e 10 dias
          </p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {preview.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <DueSoonRow item={item} />
              </li>
            ))}
          </ul>
          {extra > 0 ? (
            <p className="mt-1 text-[11px] text-muted-foreground">+{extra} outro(s)</p>
          ) : null}
          <Link
            to="/alertas"
            className="mt-2 inline-block text-[11px] font-semibold text-red-400 hover:text-red-300"
          >
            Ver Central de Alertas →
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Fechar notificação"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
