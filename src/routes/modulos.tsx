import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, Car, Package, ArrowRight, LockKeyhole, Construction, Shield, LogOut } from "lucide-react";
import { getCurrentProfile, getSession, logout } from "@/lib/auth";
import { isAuthorized, type UserProfile } from "@/lib/authz";

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
  { id: "inqueritos", titulo: "INQUÉRITOS", hint: "Procedimentos investigativos", descricao: "IP, APF, TCO, BOC e AIAI — controle de prazos, situações e equipes.", icon: FileText, tone: "success", to: "/", disponivel: true },
  { id: "veiculos", titulo: "VEÍCULOS APREENDIDOS", hint: "Pátio e custódia", descricao: "Registro de veículos apreendidos, vínculo a procedimentos e devoluções.", icon: Car, tone: "info", disponivel: false },
  { id: "objetos", titulo: "OBJETOS APREENDIDOS", hint: "Bens, armas e cautelas", descricao: "Cadastro e rastreio de objetos apreendidos vinculados a casos.", icon: Package, tone: "warning", disponivel: false },
];

function ModulosPage() {
  const navigate = useNavigate();
  const [aviso, setAviso] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const session = await getSession();
        if (!session) {
          if (!cancelled) navigate({ to: "/login", replace: true });
          return;
        }

        const currentProfile = await getCurrentProfile();
        if (!currentProfile) {
          if (!cancelled) navigate({ to: "/login", search: { erro: "profile_missing" } as never, replace: true });
          return;
        }

        if (currentProfile.status_autorizacao === "bloqueado") {
          await logout();
          if (!cancelled) navigate({ to: "/login", search: { erro: "access_blocked" } as never, replace: true });
          return;
        }

        if (!isAuthorized(currentProfile)) {
          if (!cancelled) navigate({ to: "/aguardando-autorizacao", replace: true });
          return;
        }

        if (!cancelled) setProfile(currentProfile);
      } catch (error) {
        console.error("[ModulosPage] Falha ao validar sessão/perfil", error);
        if (!cancelled) navigate({ to: "/login", search: { erro: "profile_load_failed" } as never, replace: true });
      } finally {
        if (!cancelled) setCheckingAuth(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 2800);
    return () => clearTimeout(t);
  }, [aviso]);

  if (checkingAuth) return null;
  if (!profile) return null;

  return (
    <div className="min-h-screen w-full bg-background text-foreground px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-4">
          <h1 className="text-2xl font-bold tracking-wide text-foreground">Módulos do Sistema</h1>
          <p className="text-sm text-muted-foreground">Selecione um módulo para acessar suas funcionalidades</p>
        </div>

        <div className="mb-5 rounded-xl border border-border bg-card/70 backdrop-blur-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-wide">SIPI</div>
              <div className="text-xs text-muted-foreground">DT Itabela — 23ª COORPIN</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-semibold">{profile.nome}</div>
              <div className="text-[10px] text-muted-foreground">{profile.cargo}</div>
            </div>
            <button
              onClick={async () => {
                await logout();
                navigate({ to: "/login", replace: true });
              }}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {MODULOS.map((m) => (
            <ModuloCard key={m.id} modulo={m} onIndisponivel={() => setAviso(`Módulo "${m.titulo}" em desenvolvimento — em breve.`)} />
          ))}
        </div>

        {aviso && (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border border-warning/40 bg-card shadow-2xl px-4 py-3 flex items-start gap-3">
            <Construction className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <div className="text-sm text-foreground">{aviso}</div>
          </div>
        )}
      </div>
    </div>
  );
}

const TONE_STYLES: Record<ModuloTone, { iconBg: string; iconBorder: string; iconText: string; ring: string; chip: string }> = {
  success: { iconBg: "bg-success/15", iconBorder: "border-success/30", iconText: "text-success", ring: "hover:border-success/50 hover:shadow-success/10", chip: "bg-success/15 text-success border-success/30" },
  info: { iconBg: "bg-info/15", iconBorder: "border-info/30", iconText: "text-info", ring: "hover:border-info/50 hover:shadow-info/10", chip: "bg-info/15 text-info border-info/30" },
  warning: { iconBg: "bg-warning/15", iconBorder: "border-warning/30", iconText: "text-warning", ring: "hover:border-warning/50 hover:shadow-warning/10", chip: "bg-warning/15 text-warning border-warning/30" },
};

function ModuloCard({ modulo, onIndisponivel }: { modulo: Modulo; onIndisponivel: () => void }) {
  const Icon = modulo.icon;
  const styles = TONE_STYLES[modulo.tone];
  const cardContent = (<div className={`group relative h-full bg-card border border-border rounded-xl p-6 flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${styles.ring} ${modulo.disponivel ? "cursor-pointer" : "cursor-not-allowed opacity-95"}`}><div className="flex items-start justify-between mb-5"><div className={`h-14 w-14 rounded-xl border ${styles.iconBg} ${styles.iconBorder} flex items-center justify-center`}><Icon className={`h-7 w-7 ${styles.iconText}`} /></div>{!modulo.disponivel && (<span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded border border-border bg-muted/40 text-muted-foreground"><LockKeyhole className="h-3 w-3" /> Em breve</span>)}</div><div className={`text-[10px] font-bold tracking-[0.2em] mb-1.5 inline-flex w-fit px-2 py-0.5 rounded border ${styles.chip}`}>{modulo.hint}</div><h3 className="text-lg font-bold tracking-wide text-foreground mb-2">{modulo.titulo}</h3><p className="text-sm text-muted-foreground leading-relaxed flex-1">{modulo.descricao}</p><div className="mt-6 pt-4 border-t border-border flex items-center justify-between"><span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground group-hover:text-foreground transition-colors">Acessar módulo</span><ArrowRight className={`h-4 w-4 ${styles.iconText} transition-transform group-hover:translate-x-1`} /></div></div>);

  if (modulo.disponivel && modulo.to) return <Link to={modulo.to} className="block h-full">{cardContent}</Link>;
  return <button type="button" onClick={onIndisponivel} className="block h-full text-left w-full cursor-not-allowed">{cardContent}</button>;
}
