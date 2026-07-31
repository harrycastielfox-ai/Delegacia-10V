import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bike,
  BusFront,
  Car,
  CarFront,
  CheckCircle2,
  CircleParking,
  SearchCheck,
  ShieldCheck,
  Truck,
  Warehouse,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StatCard } from "@/components/StatCard";
import { getVehicleOverviewStats } from "@/lib/repositories/vehiclesRepository";
import { VEHICLE_TYPE_LABELS } from "../vehicleConstants";
import type { VehicleOverviewStats, VehicleType } from "../vehicleTypes";

const EMPTY_STATS: VehicleOverviewStats = {
  total: 0,
  seized: 0,
  recovered: 0,
  adulterated: 0,
  pendingIdentification: 0,
  releasedThisMonth: 0,
  byType: {},
  bySituation: {},
  monthly: [],
};

const categoryCards: Array<{ type: VehicleType; label: string; to: string; icon: typeof Car }> = [
  { type: "automovel", label: "Automóveis", to: "/veiculos/automoveis", icon: Car },
  { type: "motocicleta", label: "Motocicletas", to: "/veiculos/motocicletas", icon: CarFront },
  { type: "caminhao", label: "Caminhões", to: "/veiculos/caminhoes", icon: Truck },
  { type: "onibus", label: "Ônibus", to: "/veiculos/onibus", icon: BusFront },
  { type: "bicicleta", label: "Bicicletas", to: "/veiculos/bicicletas", icon: Bike },
  { type: "outro", label: "Outros", to: "/veiculos/outros", icon: Warehouse },
];

export default function VehicleOverviewPage() {
  const [stats, setStats] = useState<VehicleOverviewStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getVehicleOverviewStats()
      .then((data) => {
        if (!cancelled) setStats({ ...EMPTY_STATS, ...data });
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar a Visão Geral de Veículos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const typeChart = useMemo(
    () =>
      categoryCards.map((category) => ({
        name: VEHICLE_TYPE_LABELS[category.type],
        total: Number(stats.byType[category.type] ?? 0),
      })),
    [stats.byType],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-info/25 bg-info/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-info">
            MÓDULO VEÍCULOS
          </div>
          <h1 className="text-3xl font-black tracking-tight">VEÍCULOS APREENDIDOS</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Cadastro, identificação, custódia e acompanhamento de veículos vinculados a ocorrências
            e procedimentos policiais.
          </p>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section
        aria-label="Indicadores de veículos"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
      >
        <StatCard
          label="TOTAL"
          value={loading ? "—" : stats.total}
          hint="Veículos cadastrados"
          icon={CircleParking}
          tone="info"
        />
        <StatCard
          label="APREENDIDOS"
          value={loading ? "—" : stats.seized}
          hint="Atualmente em custódia"
          icon={CarFront}
          tone="info"
        />
        <StatCard
          label="RECUPERADOS"
          value={loading ? "—" : stats.recovered}
          hint="Localizados pela unidade"
          icon={ShieldCheck}
          tone="success"
        />
        <StatCard
          label="ADULTERADOS"
          value={loading ? "—" : stats.adulterated}
          hint="Com sinais registrados"
          icon={SearchCheck}
          tone="destructive"
        />
        <StatCard
          label="IDENTIFICAÇÃO"
          value={loading ? "—" : stats.pendingIdentification}
          hint="Com pendências"
          icon={AlertTriangle}
          tone="warning"
        />
        <StatCard
          label="LIBERADOS NO MÊS"
          value={loading ? "—" : stats.releasedThisMonth}
          hint="Liberados ou devolvidos"
          icon={CheckCircle2}
          tone="success"
        />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Categorias rápidas</h2>
            <p className="text-xs text-muted-foreground">
              A mesma base, organizada por tipo de veículo.
            </p>
          </div>
          <Link to="/veiculos/todos" className="text-xs font-semibold text-info hover:underline">
            Ver todos
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {categoryCards.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.type}
                to={category.to}
                className="group rounded-xl border border-border bg-card p-4 transition hover:border-info/45 hover:bg-info/5"
              >
                <Icon className="h-5 w-5 text-info" />
                <p className="mt-4 text-sm font-semibold">{category.label}</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-info">
                  {loading ? "—" : Number(stats.byType[category.type] ?? 0)}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">Distribuição por categoria</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Gráfico carregado somente nesta Visão Geral.
          </p>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeChart} margin={{ top: 10, right: 8, left: -24, bottom: 20 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  angle={-15}
                  textAnchor="end"
                  height={55}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                  }}
                />
                <Bar dataKey="total" name="Veículos" fill="var(--info)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">Cadastros recentes</h2>
          <p className="mt-1 text-xs text-muted-foreground">Evolução dos últimos seis meses.</p>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthly} margin={{ top: 10, right: 8, left: -24, bottom: 10 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                  }}
                />
                <Bar dataKey="total" name="Cadastros" fill="var(--info)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
