import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, Car, Package, ArrowRight, LockKeyhole, Construction } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { isLoggedIn } from "@/lib/auth";

export const Route = createFileRoute("/modulos")({
  head: () => ({
    meta: [
      { title: "Módulos do Sistema — SIPI" },
      { name: "description", content: "Selecione um módulo do Sistema de Inquéritos Policiais." },
    ],
  }),
  component: ModulosPage,
});

type ModuloTone = "success" | "info" | "warning";

interface Modulo {
  id: string;
  titulo: string;
  hint: string;
  descricao: string;
  icon: typeof FileText;
  tone: ModuloTone;
  to?: string;
  disponivel: boolean;
}

const MODULOS: Modulo[] = [
  {
    id: "inqueritos",
    titulo: "INQUÉRITOS",
    hint: "Procedimentos investigativos",
    descricao: "IP, APF, TCO, BOC e AIAI — controle de prazos, situações e equipes.",
    icon: FileText,
    tone: "success",
    to: "/inqueritos",
    disponivel: true,
  },
  {
    id: "veiculos",
    titulo: "VEÍCULOS APREENDIDOS",
    hint: "Pátio e custódia",
    descricao: "Registro de veículos apreendidos, vínculo a procedimentos e devoluções.",
    icon: Car,
    tone: "info",
    disponivel: false,
  },
  {
    id: "objetos",
    titulo: "OBJETOS APREENDIDOS",
    hint: "Bens, armas e cautelas",
    descricao: "Cadastro e rastreio de objetos apreendidos vinculados a casos.",
    icon: Package,
    tone: "warning",
    disponivel: false,
  },
];

function ModulosPage() {
  const navigate = useNavigate();
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate({ to: "/login" });
    }
  }, [navigate]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 2800);
    return () => clearTimeout(t);
  }, [aviso]);

  return (
    <AppLayout>
      <PageHeader
        title="Módulos do Sistema"
        subtitle="Selecione um módulo para acessar suas funcionalidades"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {MODULOS.map((m) => (
          <ModuloCard
            key={m.id}
            modulo={m}
            onIndisponivel={() =>
              setAviso(`Módulo "${m.titulo}" em desenvolvimento — em breve.`)
            }
          />
        ))}
      </div>

      {aviso && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border border-warning/40 bg-card shadow-2xl px-4 py-3 flex items-start gap-3">
          <Construction className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <div className="text-sm text-foreground">{aviso}</div>
        </div>
      )}
    </AppLayout>
  );
}

const TONE_STYLES: Record<
  ModuloTone,
  { iconBg: string; iconBorder: string; iconText: string; ring: string; chip: string }
> = {
  success: {
    iconBg: "bg-success/15",
    iconBorder: "border-success/30",
    iconText: "text-success",
    ring: "hover:border-success/50 hover:shadow-success/10",
    chip: "bg-success/15 text-success border-success/30",
  },
  info: {
    iconBg: "bg-info/15",
    iconBorder: "border-info/30",
    iconText: "text-info",
    ring: "hover:border-info/50 hover:shadow-info/10",
    chip: "bg-info/15 text-info border-info/30",
  },
  warning: {
    iconBg: "bg-warning/15",
    iconBorder: "border-warning/30",
    iconText: "text-warning",
    ring: "hover:border-warning/50 hover:shadow-warning/10",
    chip: "bg-warning/15 text-warning border-warning/30",
  },
};

function ModuloCard({
  modulo,
  onIndisponivel,
}: {
  modulo: Modulo;
  onIndisponivel: () => void;
}) {
  const Icon = modulo.icon;
  const styles = TONE_STYLES[modulo.tone];

  const cardContent = (
    <div
      className={`group relative h-full bg-card border border-border rounded-xl p-6 flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${styles.ring} ${
        modulo.disponivel ? "cursor-pointer" : "cursor-pointer opacity-95"
      }`}
    >
      <div className="flex items-start justify-between mb-5">
        <div
          className={`h-14 w-14 rounded-xl border ${styles.iconBg} ${styles.iconBorder} flex items-center justify-center`}
        >
          <Icon className={`h-7 w-7 ${styles.iconText}`} />
        </div>
        {!modulo.disponivel && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded border border-border bg-muted/40 text-muted-foreground">
            <LockKeyhole className="h-3 w-3" /> Em breve
          </span>
        )}
      </div>

      <div className={`text-[10px] font-bold tracking-[0.2em] mb-1.5 inline-flex w-fit px-2 py-0.5 rounded border ${styles.chip}`}>
        {modulo.hint}
      </div>

      <h3 className="text-lg font-bold tracking-wide text-foreground mb-2">
        {modulo.titulo}
      </h3>

      <p className="text-sm text-muted-foreground leading-relaxed flex-1">
        {modulo.descricao}
      </p>

      <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground group-hover:text-foreground transition-colors">
          Acessar módulo
        </span>
        <ArrowRight className={`h-4 w-4 ${styles.iconText} transition-transform group-hover:translate-x-1`} />
      </div>
    </div>
  );

  if (modulo.disponivel && modulo.to) {
    return (
      <Link to={modulo.to} className="block h-full">
        {cardContent}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onIndisponivel} className="block h-full text-left w-full">
      {cardContent}
    </button>
  );
}
