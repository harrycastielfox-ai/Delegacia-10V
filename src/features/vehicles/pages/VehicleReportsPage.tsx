import { useEffect, useState } from "react";
import { FileDown, LoaderCircle, Printer } from "lucide-react";
import { SipiPrintSheet } from "@/components/SipiPrintSheet";
import { getVehicleOverviewStats } from "@/lib/repositories/vehiclesRepository";
import { VEHICLE_SITUATION_LABELS, VEHICLE_TYPE_LABELS } from "../vehicleConstants";
import type { VehicleOverviewStats } from "../vehicleTypes";

export default function VehicleReportsPage() {
  const [stats, setStats] = useState<VehicleOverviewStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getVehicleOverviewStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível preparar o relatório.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats && !error)
    return (
      <div className="flex min-h-[45vh] items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-info" />
      </div>
    );
  if (!stats)
    return (
      <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </p>
    );

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-info">VEÍCULOS APREENDIDOS</p>
          <h1 className="mt-1 text-3xl font-black">Relatórios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumo consolidado com dados reais da base.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-info px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Printer className="h-4 w-4" /> Imprimir resumo
        </button>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[
          ["Total de veículos", stats.total],
          ["Atualmente apreendidos", stats.seized],
          ["Recuperados", stats.recovered],
          ["Com sinais de adulteração", stats.adulterated],
          ["Pendentes de identificação", stats.pendingIdentification],
          ["Liberados no mês", stats.releasedThisMonth],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-border bg-card p-5">
            <FileDown className="h-4 w-4 text-info" />
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-3xl font-black text-info">{value}</p>
          </div>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">Por categoria</h2>
          <dl className="mt-4 space-y-3">
            {Object.entries(VEHICLE_TYPE_LABELS).map(([key, label]) => (
              <div
                key={key}
                className="flex items-center justify-between border-b border-border/70 pb-2 text-sm"
              >
                <dt>{label}</dt>
                <dd className="font-mono font-bold text-info">
                  {Number(stats.byType[key as keyof typeof stats.byType] ?? 0)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">Por situação</h2>
          <dl className="mt-4 space-y-3">
            {Object.entries(VEHICLE_SITUATION_LABELS).map(([key, label]) => (
              <div
                key={key}
                className="flex items-center justify-between border-b border-border/70 pb-2 text-sm"
              >
                <dt>{label}</dt>
                <dd className="font-mono font-bold text-info">
                  {Number(stats.bySituation[key as keyof typeof stats.bySituation] ?? 0)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <SipiPrintSheet
        documentTitle="Relatório de Veículos Apreendidos"
        documentSubtitle="Resumo consolidado do módulo"
        identifierLabel="Emissão"
        identifier={new Intl.DateTimeFormat("pt-BR").format(new Date())}
        summary={[
          { label: "Total", value: String(stats.total) },
          { label: "Apreendidos", value: String(stats.seized) },
          { label: "Recuperados", value: String(stats.recovered) },
          { label: "Adulterados", value: String(stats.adulterated) },
        ]}
        sections={[
          {
            title: "CATEGORIAS",
            fields: Object.entries(VEHICLE_TYPE_LABELS).map(([key, label]) => ({
              label,
              value: String(Number(stats.byType[key as keyof typeof stats.byType] ?? 0)),
            })),
          },
          {
            title: "SITUAÇÕES",
            fields: Object.entries(VEHICLE_SITUATION_LABELS).map(([key, label]) => ({
              label,
              value: String(Number(stats.bySituation[key as keyof typeof stats.bySituation] ?? 0)),
            })),
          },
        ]}
      />
    </div>
  );
}
