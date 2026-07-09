import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  FileText,
  Car,
  Package,
  ArrowRight,
  LockKeyhole,
  Construction,
  Database,
  Shield,
  LogOut,
  Route as RouteIcon,
} from "lucide-react";
import { getCurrentProfile, getProfileAvatarPublicUrl, getSession, logout } from "@/lib/auth";
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

type ModuloTone = "success" | "info" | "warning" | "operational";

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
    to: "/",
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
  {
    id: "localizacao-operacional",
    titulo: "LOCALIZAÇÃO OPERACIONAL",
    hint: "Diligências e rotas",
    descricao:
      "Apoio a diligências externas com cadastro de pessoas, endereços, rotas, chegada ao local, fotos e Street View.",
    icon: RouteIcon,
    tone: "operational",
    disponivel: false,
  },
  {
    id: "extracao-dados",
    titulo: "EXTRAÇÃO DE DADOS",
    hint: "Relatórios e exportações",
    descricao:
      "Geração de relatórios operacionais, planilhas consolidadas e extrações para conferência institucional.",
    icon: Database,
    tone: "info",
    disponivel: false,
  },
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
          if (!cancelled)
            navigate({ to: "/login", search: { erro: "profile_missing" } as never, replace: true });
          return;
        }

        if (currentProfile.status_autorizacao === "bloqueado") {
          await logout();
          if (!cancelled)
            navigate({ to: "/login", search: { erro: "access_blocked" } as never, replace: true });
          return;
        }

        if (!isAuthorized(currentProfile)) {
          if (!cancelled) navigate({ to: "/aguardando-autorizacao", replace: true });
          return;
        }

        if (!cancelled) setProfile(currentProfile);
      } catch (error) {
        console.error("[ModulosPage] Falha ao validar sessão/perfil", error);
        if (!cancelled)
          navigate({
            to: "/login",
            search: { erro: "profile_load_failed" } as never,
            replace: true,
          });
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
  const avatarUrl = getProfileAvatarPublicUrl(profile.avatar_path);
  const profileInitial = (profile.nome?.trim().charAt(0) || "?").toUpperCase();

  return (
    <div className="min-h-screen w-full bg-background text-foreground px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-4">
          <h1 className="text-2xl font-bold tracking-wide text-foreground">Módulos do Sistema</h1>
          <p className="text-sm text-muted-foreground">
            Selecione um módulo para acessar suas funcionalidades
          </p>
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
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`Avatar de ${profile.nome}`}
                className="h-9 w-9 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold text-primary">
                {profileInitial}
              </div>
            )}
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
            <ModuloCard
              key={m.id}
              modulo={m}
              onIndisponivel={() =>
                setAviso(`Módulo "${m.titulo}" em breve — sendo criado neste momento.`)
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
      </div>
    </div>
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
  operational: {
    iconBg: "bg-cyan-500/10",
    iconBorder: "border-cyan-400/20",
    iconText: "text-cyan-300/85",
    ring: "",
    chip: "bg-cyan-500/10 text-cyan-100/80 border-cyan-300/20",
  },
};

function ModuloCard({ modulo, onIndisponivel }: { modulo: Modulo; onIndisponivel: () => void }) {
  const Icon = modulo.icon;
  const styles = TONE_STYLES[modulo.tone];
  const isOperationalLocation = modulo.id === "localizacao-operacional";
  const cardContent = (
    <div
      className={`group relative h-full overflow-hidden rounded-xl border p-6 flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${styles.ring} ${
        isOperationalLocation
          ? "border-border bg-card shadow-[0_0_16px_rgba(34,211,238,0.025),inset_0_1px_0_rgba(255,255,255,0.025)] group-hover:border-cyan-400/45 group-focus-visible:border-cyan-400/45 group-hover:bg-cyan-950/10 group-focus-visible:bg-cyan-950/10 group-hover:shadow-[0_0_24px_rgba(34,211,238,0.18),0_0_44px_rgba(16,185,129,0.08),inset_0_1px_0_rgba(255,255,255,0.05)] group-focus-visible:shadow-[0_0_24px_rgba(34,211,238,0.18),0_0_44px_rgba(16,185,129,0.08),inset_0_1px_0_rgba(255,255,255,0.05)]"
          : "border-border bg-card"
      } ${modulo.disponivel ? "cursor-pointer" : "cursor-not-allowed opacity-95"}`}
    >
      {isOperationalLocation && <OperationalMapBackdrop />}

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div
            className={`h-14 w-14 rounded-xl border ${styles.iconBg} ${styles.iconBorder} flex items-center justify-center ${
              isOperationalLocation
                ? "transition-all duration-200 group-hover:border-cyan-300/40 group-focus-visible:border-cyan-300/40 group-hover:bg-cyan-400/15 group-focus-visible:bg-cyan-400/15 group-hover:shadow-[0_0_14px_rgba(34,211,238,0.16)] group-focus-visible:shadow-[0_0_14px_rgba(34,211,238,0.16)]"
                : ""
            }`}
          >
            <Icon
              className={`h-7 w-7 ${styles.iconText} ${
                isOperationalLocation
                  ? "transition-all duration-200 group-hover:text-cyan-200 group-focus-visible:text-cyan-200 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.28)] group-focus-visible:drop-shadow-[0_0_8px_rgba(34,211,238,0.28)]"
                  : ""
              }`}
            />
          </div>
          {isOperationalLocation && (
            <span
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded border border-cyan-300/20 bg-slate-950/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-100/80 shadow-[0_0_10px_rgba(34,211,238,0.04)] backdrop-blur-sm"
              title="Sendo criado neste momento"
              aria-label="Em breve — sendo criado neste momento"
            >
              <LockKeyhole className="h-2.5 w-2.5 shrink-0" /> EM BREVE
            </span>
          )}
        </div>
        <div
          className={`text-[10px] font-bold tracking-[0.2em] mb-1.5 inline-flex w-fit px-2 py-0.5 rounded border ${styles.chip}`}
        >
          {modulo.hint}
        </div>
        <h3 className="text-lg font-bold tracking-wide text-foreground mb-2">{modulo.titulo}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed flex-1">{modulo.descricao}</p>
        <div
          className={`mt-6 pt-4 border-t flex items-center justify-between ${isOperationalLocation ? "border-border" : "border-border"}`}
        >
          <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground group-hover:text-foreground transition-colors">
            {modulo.disponivel ? "Acessar módulo" : "Em desenvolvimento"}
          </span>
          <ArrowRight
            className={`h-4 w-4 ${styles.iconText} transition-all ${
              modulo.disponivel ? "group-hover:translate-x-1" : "opacity-60"
            } ${
              isOperationalLocation
                ? "group-hover:text-cyan-200 group-focus-visible:text-cyan-200 group-hover:drop-shadow-[0_0_6px_rgba(34,211,238,0.24)] group-focus-visible:drop-shadow-[0_0_6px_rgba(34,211,238,0.24)]"
                : ""
            }`}
          />
        </div>
      </div>
    </div>
  );

  if (modulo.disponivel && modulo.to)
    return (
      <Link to={modulo.to} className="group block h-full">
        {cardContent}
      </Link>
    );
  return (
    <button
      type="button"
      onClick={onIndisponivel}
      className="group block h-full text-left w-full cursor-not-allowed focus-visible:outline-none"
    >
      {cardContent}
    </button>
  );
}

function OperationalMapBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.035),transparent_34%),radial-gradient(circle_at_88%_78%,rgba(16,185,129,0.03),transparent_32%),linear-gradient(135deg,rgba(2,6,23,0.30),rgba(8,47,73,0.035)_48%,rgba(2,6,23,0.70))] opacity-90 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100" />
      <svg
        className="absolute inset-0 h-full w-full opacity-35 transition-opacity duration-200 group-hover:opacity-50 group-focus-visible:opacity-50"
        viewBox="0 0 420 260"
        preserveAspectRatio="none"
        role="presentation"
      >
        <defs>
          <filter id="operational-route-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 0.13 0 0 0 0 0.83 0 0 0 0 0.93 0 0 0 0.42 0"
            />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="operational-destination-glow" x="-90%" y="-90%" width="280%" height="280%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 0.06 0 0 0 0 0.73 0 0 0 0 0.62 0 0 0 0.36 0"
            />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g fill="none" stroke="rgba(34,211,238,0.025)" strokeLinecap="round" strokeWidth="1">
          <path d="M-20 62 C44 46 92 57 151 28 S260 14 330 36 S410 52 445 22" />
          <path d="M-8 150 C46 126 72 138 113 102 S191 58 246 74 S335 99 430 82" />
          <path d="M34 258 C75 205 103 188 142 166 S222 133 281 113 S366 82 440 128" />
          <path d="M60 -14 C83 38 86 84 74 137 S60 214 83 284" />
          <path d="M165 -18 C174 48 167 100 151 146 S125 219 136 281" />
          <path d="M251 -16 C249 42 260 78 286 111 S329 177 319 278" />
          <path d="M346 -10 C331 47 326 92 353 133 S391 201 372 286" />
          <path d="M10 95 L78 88 L134 117 L197 104 L258 139 L333 121 L423 166" />
          <path d="M16 204 L92 194 L154 220 L227 201 L290 221 L408 206" />
          <path d="M104 4 L126 62 L191 91 L229 156 L292 184 L326 253" />
          <path d="M303 4 L276 45 L291 87 L260 132 L284 172 L257 241" />
        </g>

        <g fill="none" stroke="rgba(45,212,191,0.014)" strokeLinecap="round" strokeWidth="4">
          <path d="M182 252 L220 219 L260 214 L289 184 L326 179 L361 154 L386 123" />
          <path d="M248 4 L281 34 L316 47 L348 76 L382 90 L426 119" />
        </g>

        <path
          d="M215 235 L254 211 L287 214 L312 181 L345 170 L362 142 L385 132 L374 101 L337 88 L309 72"
          fill="none"
          stroke="rgba(34,211,238,0.09)"
          className="transition-all duration-200 group-hover:stroke-[rgba(34,211,238,0.18)] group-focus-visible:stroke-[rgba(34,211,238,0.18)]"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
          filter="url(#operational-route-glow)"
        />
        <path
          d="M215 235 L254 211 L287 214 L312 181 L345 170 L362 142 L385 132 L374 101 L337 88 L309 72"
          fill="none"
          stroke="rgba(16,185,129,0.055)"
          className="transition-all duration-200 group-hover:stroke-[rgba(16,185,129,0.12)] group-focus-visible:stroke-[rgba(16,185,129,0.12)]"
          strokeDasharray="7 8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.2"
        />

        <g fill="rgba(34,211,238,0.12)" filter="url(#operational-route-glow)">
          <circle cx="254" cy="211" r="3" />
          <circle cx="287" cy="214" r="2.6" />
          <circle cx="312" cy="181" r="3.4" />
          <circle cx="345" cy="170" r="2.8" />
          <circle cx="362" cy="142" r="3.2" />
          <circle cx="374" cy="101" r="3.1" />
          <circle cx="337" cy="88" r="2.6" />
        </g>
        <g filter="url(#operational-destination-glow)">
          <circle cx="309" cy="72" r="8" fill="rgba(20,184,166,0.045)" />
          <circle cx="309" cy="72" r="4.5" fill="rgba(34,211,238,0.14)" />
          <circle cx="309" cy="72" r="2.2" fill="rgba(240,253,250,0.24)" />
        </g>
      </svg>
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/88 via-slate-950/70 to-slate-950/46" />
      <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/5" />
    </div>
  );
}
