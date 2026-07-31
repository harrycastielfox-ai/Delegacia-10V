import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BusFront,
  Car,
  CarFront,
  CheckCircle2,
  CircleParking,
  FileCheck2,
  FileDown,
  LoaderCircle,
  MapPinned,
  SearchCheck,
  ShieldCheck,
  Truck,
  Warehouse,
  Bike,
  type LucideIcon,
} from "lucide-react";
import { SipiPrintSheet } from "@/components/SipiPrintSheet";
import { getVehicleOverviewStats } from "@/lib/repositories/vehiclesRepository";
import { VEHICLE_SITUATION_FILTER_LABELS, VEHICLE_TYPE_LABELS } from "../vehicleConstants";
import type { VehicleOverviewStats, VehicleSituationFilter, VehicleType } from "../vehicleTypes";

type ReportLinkMeta = {
  href: string;
  color: string;
  icon: LucideIcon;
};

const TYPE_META: Record<VehicleType, ReportLinkMeta> = {
  automovel: { href: "/veiculos/automoveis", color: "var(--info)", icon: Car },
  motocicleta: {
    href: "/veiculos/motocicletas",
    color: "var(--purple)",
    icon: CarFront,
  },
  caminhao: { href: "/veiculos/caminhoes", color: "var(--warning)", icon: Truck },
  onibus: { href: "/veiculos/onibus", color: "var(--destructive)", icon: BusFront },
  bicicleta: { href: "/veiculos/bicicletas", color: "var(--success)", icon: Bike },
  outro: { href: "/veiculos/outros", color: "var(--muted-foreground)", icon: Warehouse },
};

const SITUATION_META: Record<VehicleSituationFilter, ReportLinkMeta> = {
  regular: {
    href: "/veiculos/todos?situation=regular",
    color: "var(--success)",
    icon: CheckCircle2,
  },
  apreendido: { href: "/veiculos/apreendidos", color: "var(--info)", icon: CarFront },
  liberado: { href: "/veiculos/liberados", color: "var(--success)", icon: CheckCircle2 },
  adulterado: {
    href: "/veiculos/adulterados",
    color: "var(--destructive)",
    icon: SearchCheck,
  },
  em_investigacao: {
    href: "/veiculos/todos?situation=em_investigacao",
    color: "var(--warning)",
    icon: SearchCheck,
  },
  recuperado: {
    href: "/veiculos/recuperados",
    color: "var(--purple)",
    icon: ShieldCheck,
  },
  periciado: {
    href: "/veiculos/todos?situation=periciado",
    color: "var(--info)",
    icon: FileCheck2,
  },
  pendente_identificacao: {
    href: "/veiculos/todos?situation=pendente_identificacao",
    color: "var(--warning)",
    icon: AlertTriangle,
  },
  nao_informada: {
    href: "/veiculos/todos?situation=nao_informada",
    color: "var(--muted-foreground)",
    icon: CircleParking,
  },
};

function percentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );
}

function CoverageRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const progress = percentage(value, total);
  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3 text-sm">
        <span className="font-semibold">{label}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {value} de {total} · <strong className="text-foreground">{progress}%</strong>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${progress}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function DistributionRow({
  label,
  total,
  overall,
  meta,
}: {
  label: string;
  total: number;
  overall: number;
  meta: ReportLinkMeta;
}) {
  const Icon = meta.icon;
  const progress = percentage(total, overall);

  return (
    <a
      href={meta.href}
      className="group block rounded-xl border border-transparent px-3 py-2.5 transition hover:border-border hover:bg-background/55"
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{
            color: meta.color,
            backgroundColor: `color-mix(in oklab, ${meta.color} 13%, transparent)`,
          }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-semibold">{label}</span>
            <span
              className="flex items-center gap-2 font-mono font-black"
              style={{ color: meta.color }}
            >
              {total}
              <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/55">
            <div
              className="h-full rounded-full"
              style={{ width: `${progress}%`, backgroundColor: meta.color }}
            />
          </div>
        </div>
      </div>
    </a>
  );
}

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

  const emittedAt = useMemo(() => new Intl.DateTimeFormat("pt-BR").format(new Date()), []);

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

  const summaryCards: Array<{
    label: string;
    value: number;
    hint: string;
    href: string;
    color: string;
    icon: LucideIcon;
  }> = [
    {
      label: "Total de veículos",
      value: stats.total,
      hint: "Abrir a base completa",
      href: "/veiculos/todos",
      color: "var(--info)",
      icon: CircleParking,
    },
    {
      label: "Atualmente apreendidos",
      value: stats.seized,
      hint: "Veículos em custódia",
      href: "/veiculos/apreendidos",
      color: "var(--info)",
      icon: CarFront,
    },
    {
      label: "Recuperados",
      value: stats.recovered,
      hint: "Localizados pela unidade",
      href: "/veiculos/recuperados",
      color: "var(--purple)",
      icon: ShieldCheck,
    },
    {
      label: "Com adulteração",
      value: stats.adulterated,
      hint: "Sinais registrados",
      href: "/veiculos/adulterados",
      color: "var(--destructive)",
      icon: SearchCheck,
    },
    {
      label: "Pendentes de identificação",
      value: stats.pendingIdentification,
      hint: "Abrir pendências",
      href: "/veiculos/todos?pending=true",
      color: "var(--warning)",
      icon: AlertTriangle,
    },
    {
      label: "Liberados / devolvidos",
      value: stats.releasedTotal,
      hint: `${stats.releasedThisMonth} no mês atual`,
      href: "/veiculos/liberados",
      color: "var(--success)",
      icon: CheckCircle2,
    },
    {
      label: "Situação não informada",
      value: stats.unassignedSituation,
      hint: "Revisar e classificar",
      href: "/veiculos/todos?situation=nao_informada",
      color: "var(--muted-foreground)",
      icon: CircleParking,
    },
  ];

  return (
    <div className="sipi-print-document space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-info">VEÍCULOS APREENDIDOS</p>
          <h1 className="mt-1 text-3xl font-black">Resumo geral</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão consolidada, cobertura cadastral e atalhos para cada consulta.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/veiculos/todos"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm font-semibold transition hover:border-info/40 hover:bg-info/5"
          >
            <CircleParking className="h-4 w-4 text-info" /> Abrir base
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="group inline-flex min-w-52 items-center gap-3 rounded-xl bg-info px-3 py-2.5 text-left text-white shadow-lg shadow-info/10 transition hover:-translate-y-0.5 hover:brightness-110"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <FileDown className="h-4 w-4" />
            </span>
            <span>
              <strong className="block text-sm">Gerar resumo em PDF</strong>
              <small className="block text-[10px] font-medium text-white/75">
                Relatório consolidado A4
              </small>
            </span>
          </button>
        </div>
      </header>

      <section aria-label="Indicadores gerais" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <a
              key={card.label}
              href={card.href}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-info/35 hover:shadow-[0_14px_40px_rgba(0,0,0,0.18)]"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{
                    color: card.color,
                    backgroundColor: `color-mix(in oklab, ${card.color} 13%, transparent)`,
                  }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
              </div>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {card.label}
              </p>
              <p className="mt-1 text-3xl font-black tabular-nums" style={{ color: card.color }}>
                {card.value}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{card.hint}</p>
            </a>
          );
        })}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 lg:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-info/10 text-info">
            <FileCheck2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-bold">Cobertura cadastral</h2>
            <p className="text-xs text-muted-foreground">
              Quanto da base já possui os principais dados de consulta e custódia.
            </p>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <CoverageRow
            label="Placa informada"
            value={stats.withPlate}
            total={stats.total}
            color="var(--info)"
          />
          <CoverageRow
            label="Procedimento ou B.O."
            value={stats.withProcedure}
            total={stats.total}
            color="var(--purple)"
          />
          <CoverageRow
            label="Local de guarda"
            value={stats.withCustodyLocation}
            total={stats.total}
            color="var(--success)"
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-3">
            <h2 className="font-bold">Distribuição por categoria</h2>
            <p className="text-xs text-muted-foreground">
              Selecione uma categoria para abrir a lista.
            </p>
          </div>
          <div className="space-y-1">
            {(Object.entries(VEHICLE_TYPE_LABELS) as Array<[VehicleType, string]>).map(
              ([key, label]) => (
                <DistributionRow
                  key={key}
                  label={label}
                  total={Number(stats.byType[key] ?? 0)}
                  overall={stats.total}
                  meta={TYPE_META[key]}
                />
              ),
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-3">
            <h2 className="font-bold">Distribuição por situação</h2>
            <p className="text-xs text-muted-foreground">
              Situação vazia permanece sem classificação policial.
            </p>
          </div>
          <div className="space-y-1">
            {(
              Object.entries(VEHICLE_SITUATION_FILTER_LABELS) as Array<
                [VehicleSituationFilter, string]
              >
            ).map(([key, label]) => (
              <DistributionRow
                key={key}
                label={label}
                total={Number(stats.bySituation[key] ?? 0)}
                overall={stats.total}
                meta={SITUATION_META[key]}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple/10 text-purple">
            <MapPinned className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-bold">Cadastros por mês</h2>
            <p className="text-xs text-muted-foreground">
              Volume registrado nos últimos seis meses.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {stats.monthly.length ? (
            stats.monthly.map((month) => (
              <div
                key={month.month}
                className="rounded-xl border border-border bg-background/55 p-4"
              >
                <p className="text-xs font-semibold capitalize text-muted-foreground">
                  {monthLabel(month.month)}
                </p>
                <p className="mt-1 text-2xl font-black text-purple">{month.total}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum cadastro no período.</p>
          )}
        </div>
      </section>

      <SipiPrintSheet
        documentTitle="Resumo Geral de Veículos"
        documentSubtitle="Situação operacional, cobertura cadastral e distribuição da base"
        identifierLabel="Emissão"
        identifier={emittedAt}
        variant="summary"
        summary={[
          { label: "Total", value: String(stats.total) },
          { label: "Apreendidos", value: String(stats.seized) },
          { label: "Recuperados", value: String(stats.recovered) },
          { label: "Adulterados", value: String(stats.adulterated) },
          { label: "Pendentes de identificação", value: String(stats.pendingIdentification) },
          { label: "Situação não informada", value: String(stats.unassignedSituation) },
        ]}
        sections={[
          {
            title: "CATEGORIAS",
            fields: (Object.entries(VEHICLE_TYPE_LABELS) as Array<[VehicleType, string]>).map(
              ([key, label]) => ({ label, value: String(Number(stats.byType[key] ?? 0)) }),
            ),
          },
          {
            title: "SITUAÇÕES",
            fields: (
              Object.entries(VEHICLE_SITUATION_FILTER_LABELS) as Array<
                [VehicleSituationFilter, string]
              >
            ).map(([key, label]) => ({
              label,
              value: String(Number(stats.bySituation[key] ?? 0)),
            })),
          },
          {
            title: "COBERTURA CADASTRAL",
            fields: [
              {
                label: "Placa informada",
                value: `${stats.withPlate} de ${stats.total} (${percentage(stats.withPlate, stats.total)}%)`,
              },
              {
                label: "Procedimento ou B.O.",
                value: `${stats.withProcedure} de ${stats.total} (${percentage(stats.withProcedure, stats.total)}%)`,
              },
              {
                label: "Local de guarda",
                value: `${stats.withCustodyLocation} de ${stats.total} (${percentage(stats.withCustodyLocation, stats.total)}%)`,
              },
              { label: "Liberados / devolvidos", value: String(stats.releasedTotal) },
            ],
          },
          {
            title: "CADASTROS POR MÊS",
            fields: stats.monthly.map((month) => ({
              label: monthLabel(month.month),
              value: String(month.total),
            })),
          },
        ]}
      />
    </div>
  );
}
