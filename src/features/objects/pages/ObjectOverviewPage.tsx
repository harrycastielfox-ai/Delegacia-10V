import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  CircleDot,
  Crosshair,
  FileQuestion,
  Flame,
  Gem,
  KeyRound,
  Package,
  FileText,
  Smartphone,
  Warehouse,
  Wrench,
  Pill,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatCard } from "@/components/StatCard";
import { getObjectOverviewStats } from "@/lib/repositories/objectsRepository";
import { OBJECT_TYPE_LABELS } from "../objectConstants";
import type { ObjectOverviewStats, ObjectType } from "../objectTypes";

const EMPTY_STATS: ObjectOverviewStats = {
  total: 0,
  seized: 0,
  released: 0,
  destroyed: 0,
  pendingIdentification: 0,
  withoutProcedure: 0,
  releasedThisMonth: 0,
  byType: {},
  bySituation: {},
  monthly: [],
};

const categoryCards: Array<{
  type: ObjectType;
  label: string;
  icon: typeof Crosshair;
  color: string;
}> = [
  { type: "arma_fogo", label: "Armas de Fogo", icon: Crosshair, color: "var(--destructive)" },
  { type: "municao", label: "Munição", icon: CircleDot, color: "var(--warning)" },
  { type: "entorpecente", label: "Entorpecentes", icon: Pill, color: "var(--purple)" },
  {
    type: "dinheiro_valores",
    label: "Dinheiro / Valores",
    icon: Banknote,
    color: "var(--success)",
  },
  { type: "eletronico", label: "Eletrônicos", icon: Smartphone, color: "var(--info)" },
  { type: "documento", label: "Documentos", icon: FileText, color: "var(--info)" },
  { type: "joia_bem_valor", label: "Joias / Bens de Valor", icon: Gem, color: "var(--purple)" },
  { type: "ferramenta", label: "Ferramentas", icon: Wrench, color: "var(--warning)" },
  { type: "outro", label: "Outros", icon: Warehouse, color: "var(--muted-foreground)" },
];

export default function ObjectOverviewPage() {
  const [stats, setStats] = useState<ObjectOverviewStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getObjectOverviewStats()
      .then((data) => {
        if (!cancelled) setStats({ ...EMPTY_STATS, ...data });
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar a Visão Geral de Objetos.");
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
        type: category.type,
        name: OBJECT_TYPE_LABELS[category.type],
        total: Number(stats.byType[category.type] ?? 0),
        color: category.color,
      })),
    [stats.byType],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-warning/25 bg-warning/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-warning">
            MÓDULO OBJETOS
          </div>
          <h1 className="text-3xl font-black tracking-tight">OBJETOS APREENDIDOS</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Cadastro, custódia e rastreio de bens apreendidos — armas, entorpecentes, dinheiro,
            eletrônicos e demais objetos vinculados a ocorrências e procedimentos policiais.
          </p>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section
        aria-label="Indicadores de objetos"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
      >
        <Link
          to="/objetos/todos"
          aria-label="Abrir todos os objetos"
          className="block rounded-2xl transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning"
        >
          <StatCard
            label="TOTAL"
            value={loading ? "—" : stats.total}
            hint="Objetos cadastrados"
            icon={Package}
            tone="warning"
          />
        </Link>
        <Link
          to="/objetos/todos"
          search={{ situation: "apreendido" }}
          aria-label="Abrir objetos apreendidos"
          className="block rounded-2xl transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning"
        >
          <StatCard
            label="APREENDIDOS"
            value={loading ? "—" : stats.seized}
            hint="Atualmente em custódia"
            icon={KeyRound}
            tone="warning"
          />
        </Link>
        <Link
          to="/objetos/todos"
          search={{ withoutProcedure: true }}
          aria-label="Abrir objetos sem procedimento vinculado"
          className="block rounded-2xl transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
        >
          <StatCard
            label="SEM PROCEDIMENTO"
            value={loading ? "—" : stats.withoutProcedure}
            hint="Sem IP, TCO ou B.O. vinculado"
            icon={FileQuestion}
            tone="destructive"
          />
        </Link>
        <Link
          to="/objetos/todos"
          search={{ situation: "incinerado" }}
          aria-label="Abrir objetos incinerados ou destruídos"
          className="block rounded-2xl transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
        >
          <StatCard
            label="INCINERADOS"
            value={loading ? "—" : stats.destroyed}
            hint="Destruídos por determinação"
            icon={Flame}
            tone="destructive"
          />
        </Link>
        <Link
          to="/objetos/todos"
          search={{ pending: true }}
          aria-label="Abrir objetos com identificação pendente"
          className="block rounded-2xl transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning"
        >
          <StatCard
            label="IDENTIFICAÇÃO"
            value={loading ? "—" : stats.pendingIdentification}
            hint="Com pendências"
            icon={AlertTriangle}
            tone="warning"
          />
        </Link>
        <Link
          to="/objetos/todos"
          search={{ situation: "liberado" }}
          aria-label="Abrir objetos liberados ou devolvidos"
          className="block rounded-2xl transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
        >
          <StatCard
            label="LIBERADOS NO MÊS"
            value={loading ? "—" : stats.releasedThisMonth}
            hint="Liberados ou devolvidos"
            icon={CheckCircle2}
            tone="success"
          />
        </Link>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Categorias rápidas</h2>
            <p className="text-xs text-muted-foreground">
              A mesma base, organizada por tipo de objeto.
            </p>
          </div>
          <Link to="/objetos/todos" className="text-xs font-semibold text-warning hover:underline">
            Ver todos
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {categoryCards.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.type}
                to="/objetos/todos"
                search={{ objectType: category.type }}
                className="group rounded-xl border border-border bg-card p-4 transition hover:border-warning/45 hover:bg-warning/5"
              >
                <Icon className="h-5 w-5 text-warning" />
                <p className="mt-4 text-sm font-semibold">{category.label}</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-warning">
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
              <BarChart data={typeChart} margin={{ top: 10, right: 8, left: -24, bottom: 40 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  angle={-25}
                  textAnchor="end"
                  height={70}
                  interval={0}
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
                <Bar dataKey="total" name="Objetos" radius={[6, 6, 0, 0]}>
                  {typeChart.map((category) => (
                    <Cell key={category.type} fill={category.color} />
                  ))}
                </Bar>
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
                <Bar dataKey="total" name="Cadastros" fill="var(--warning)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
