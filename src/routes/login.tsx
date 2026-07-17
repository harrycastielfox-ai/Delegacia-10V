import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  authenticateWithLoginOrEmail,
  AuthFlowError,
  getCurrentProfile,
  getSession,
  logout,
} from "@/lib/auth";
import { isAuthorized } from "@/lib/authz";
import {
  AccessContextError,
  captureNetworkAccessContext,
  getLatestUserAccessContext,
  registerOwnAccessContext,
  requestPreciseLocation,
} from "@/lib/accessContext";

const POST_SIGNUP_LOGIN_KEY = "sipi:post-signup-login";
const POST_SIGNUP_MESSAGE =
  "Conta criada com sucesso. Aguarde autorização de um administrador para acessar o SIPI.";

function registerAccessContextInBackground() {
  return registerOwnAccessContext()
    .then(() => captureNetworkAccessContext())
    .catch((error) => {
      if (error instanceof AccessContextError && error.code === "UNAVAILABLE") return;
      if (import.meta.env.DEV) {
        console.warn("[login] Não foi possível registrar o contexto do acesso.");
      }
    });
}

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Acesso Restrito — SIPI" },
      { name: "description", content: "Tela de autenticação do Sistema de Inquéritos Policiais." },
    ],
  }),
  component: LoginPage,
});

function getFriendlyLoginError(err: unknown): string {
  const errorLike = err as { message?: string; cause?: { message?: string } };
  const msg = String(errorLike.message || errorLike.cause?.message || "").toLowerCase();

  if (err instanceof AuthFlowError) {
    if (err.code === "LOGIN_NOT_FOUND") return "Login inexistente. Verifique o usuário informado.";
    if (err.code === "PROFILE_NOT_FOUND")
      return "Autenticação concluída, mas o perfil não foi encontrado.";
    if (err.code === "PROFILE_RLS_DENIED")
      return "Seu perfil existe, mas a policy (RLS) bloqueou a leitura.";
    if (err.code === "PROFILE_FETCH_FAILED")
      return "Autenticação concluída, mas houve falha ao carregar o perfil.";
    if (err.code === "LOGIN_RESOLVE_FAILED")
      return "Falha ao validar login. Tente novamente em instantes.";
    if (err.code === "AUTH_INVALID_CREDENTIALS")
      return "Credenciais inválidas. Confira usuário/e-mail e senha.";
  }

  if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
    return "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.";
  }

  if (msg.includes("too many requests") || msg.includes("over_request_rate_limit")) {
    return "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.";
  }

  if (
    msg.includes("invalid login credentials") ||
    msg.includes("invalid grant") ||
    msg.includes("invalid login")
  ) {
    return "Credenciais inválidas. Confira usuário/e-mail e senha.";
  }

  return "Falha no login. Verifique suas credenciais e permissões.";
}

function readPostSignupLogin() {
  try {
    const raw = sessionStorage.getItem(POST_SIGNUP_LOGIN_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(POST_SIGNUP_LOGIN_KEY);
    const parsed = JSON.parse(raw) as { login?: unknown; password?: unknown; message?: unknown };
    return {
      login: typeof parsed.login === "string" ? parsed.login : "",
      password: typeof parsed.password === "string" ? parsed.password : "",
      message:
        typeof parsed.message === "string" && parsed.message.trim()
          ? parsed.message
          : POST_SIGNUP_MESSAGE,
    };
  } catch (error) {
    console.warn("[LoginPage] Não foi possível ler dados temporários pós-cadastro", error);
    sessionStorage.removeItem(POST_SIGNUP_LOGIN_KEY);
    return null;
  }
}

function PostSignupWelcomeOverlay({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="post-signup-welcome fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-background/96 px-4 text-foreground backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10" />
        <div className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/15" />
        <div className="absolute left-1/2 top-1/2 h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>

      <section className="post-signup-welcome-card relative w-full max-w-xl overflow-hidden rounded-3xl border border-primary/25 bg-card/95 p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.55),0_0_48px_rgba(34,197,94,0.12)]">
        <span
          className="post-signup-panel-sheen pointer-events-none absolute inset-y-[-35%] left-[-70%] z-0 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-sm"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto h-36 w-36 overflow-hidden drop-shadow-[0_0_30px_rgba(34,197,94,0.2)]">
          <img src="/sipi-logo.png" alt="Logo SIPI" className="h-full w-full object-contain" />
        </div>

        <div
          className="relative z-10 mx-auto mt-4 h-1.5 w-56 overflow-hidden rounded-full border border-primary/15 bg-primary/10 shadow-[0_0_18px_rgba(34,197,94,0.12)]"
          aria-hidden="true"
        >
          <span className="post-signup-loading-bar absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_14px_rgba(34,197,94,0.55)]" />
        </div>

        <div className="post-signup-welcome-pulse relative z-10 mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-primary">
          <ShieldCheck className="h-7 w-7" aria-hidden="true" />
        </div>

        <p className="relative z-10 mt-6 text-[11px] font-black uppercase tracking-[0.28em] text-primary">
          Solicitação registrada
        </p>
        <h2 className="relative z-10 mt-3 text-3xl font-black tracking-tight text-foreground">
          Bem-vindo ao SIPI
        </h2>
        <p className="relative z-10 mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          {message}
        </p>
        <p className="relative z-10 mx-auto mt-2 max-w-md text-xs leading-5 text-muted-foreground/80">
          Aguarde a liberação institucional pelo órgão competente antes de acessar os módulos do
          sistema.
        </p>

        <p className="relative z-10 mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
          Retornando ao login em instantes...
        </p>
      </section>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [postSignupMessage, setPostSignupMessage] = useState<string | null>(null);
  const [showSignupWelcome, setShowSignupWelcome] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const postSignup = readPostSignupLogin();
    if (!postSignup) return;
    setUsuario(postSignup.login);
    setSenha(postSignup.password);
    setPostSignupMessage(postSignup.message);
    setShowSignupWelcome(true);
  }, []);

  useEffect(() => {
    if (!showSignupWelcome) return;
    const timeoutId = window.setTimeout(() => setShowSignupWelcome(false), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [showSignupWelcome]);

  useEffect(() => {
    void (async () => {
      try {
        const session = await getSession();
        if (!session) return;
        const profile = await getCurrentProfile();
        if (!profile) return;

        if (profile.status_autorizacao === "bloqueado") {
          await logout();
          return;
        }

        registerAccessContextInBackground();

        if (!isAuthorized(profile)) {
          navigate({ to: "/aguardando-autorizacao", replace: true });
          return;
        }

        navigate({ to: "/modulos", replace: true });
      } catch (error) {
        console.error("[LoginPage] Falha ao validar sessão existente", error);
      }
    })();
  }, [navigate]);

  useEffect(() => {
    const erroCode = new URLSearchParams(window.location.search).get("erro");
    if (erroCode === "profile_load_failed" || erroCode === "profile_missing") {
      setErro(
        "Login autenticado, mas não foi possível carregar o perfil. Verifique RLS/policies da tabela profiles.",
      );
    } else if (erroCode === "access_blocked") {
      setErro("Seu acesso está bloqueado. Procure um administrador do sistema.");
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);

    try {
      const loginOrEmail = usuario.trim();
      await authenticateWithLoginOrEmail(loginOrEmail, senha);

      const profile = await getCurrentProfile();
      if (!profile) {
        throw new AuthFlowError("PROFILE_FETCH_FAILED", "Perfil não encontrado após autenticação.");
      }

      if (profile.status_autorizacao === "bloqueado") {
        await logout();
        setErro("Seu acesso está bloqueado. Procure um administrador do sistema.");
        return;
      }

      await registerAccessContextInBackground();

      if (!isAuthorized(profile)) {
        navigate({ to: "/aguardando-autorizacao" });
        return;
      }

      navigate({ to: "/modulos" });
    } catch (err) {
      console.error("[LoginPage] Falha no fluxo de login", err);
      setErro(getFriendlyLoginError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 py-10 relative overflow-hidden">
      <style>{`
        .sipi-logo-sheen {
          transform: translateX(-180%) skewX(-18deg);
          animation: sipiLogoSheen 4.8s ease-in-out infinite;
          will-change: transform, opacity;
        }

        @keyframes sipiLogoSheen {
          0%, 58% {
            transform: translateX(-180%) skewX(-18deg);
            opacity: 0;
          }
          65% {
            opacity: 0.33;
          }
          78% {
            transform: translateX(210%) skewX(-18deg);
            opacity: 0;
          }
          100% {
            transform: translateX(210%) skewX(-18deg);
            opacity: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sipi-logo-sheen {
            animation: none;
            opacity: 0;
          }

          .post-signup-welcome,
          .post-signup-welcome-card,
          .post-signup-panel-sheen,
          .post-signup-loading-bar,
          .post-signup-welcome-pulse {
            animation: none !important;
          }
        }

        .post-signup-welcome-card {
          animation: postSignupWelcomeCard 520ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }

        .post-signup-welcome-pulse {
          animation: postSignupWelcomePulse 1.8s ease-in-out infinite;
        }

        .post-signup-panel-sheen {
          animation: postSignupPanelSheen 3.2s ease-in-out infinite;
          mix-blend-mode: screen;
        }

        .post-signup-loading-bar {
          animation: postSignupLoadingBar 1.65s ease-in-out infinite;
        }

        @keyframes postSignupWelcomeCard {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes postSignupWelcomePulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.24);
          }
          50% {
            box-shadow: 0 0 0 18px rgba(34, 197, 94, 0);
          }
        }

        @keyframes postSignupPanelSheen {
          0%, 28% {
            transform: translateX(-130%) rotate(12deg);
            opacity: 0;
          }
          38% {
            opacity: 0.6;
          }
          58% {
            transform: translateX(620%) rotate(12deg);
            opacity: 0;
          }
          100% {
            transform: translateX(620%) rotate(12deg);
            opacity: 0;
          }
        }

        @keyframes postSignupLoadingBar {
          0% {
            transform: translateX(-130%);
            opacity: 0.24;
          }
          45% {
            opacity: 1;
          }
          100% {
            transform: translateX(330%);
            opacity: 0.24;
          }
        }
      `}</style>

      {showSignupWelcome ? (
        <PostSignupWelcomeOverlay
          onClose={() => setShowSignupWelcome(false)}
          message={postSignupMessage ?? POST_SIGNUP_MESSAGE}
        />
      ) : null}

      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-success/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-4 flex items-center justify-center gap-2 text-[10px] tracking-[0.25em] font-bold text-destructive">
          <span className="h-px w-8 bg-destructive/50" />
          ACESSO RESTRITO
          <span className="h-px w-8 bg-destructive/50" />
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-2xl shadow-black/40">
          <div className="px-8 pt-8 pb-6 text-center border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
            <div className="relative mx-auto h-[88px] w-[88px] rounded-lg bg-primary/12 border border-primary/25 shadow-[0_0_12px_rgba(34,197,94,0.16)] flex items-center justify-center mb-3 p-2 overflow-hidden">
              <img
                src="/sipi-logo.png"
                alt="Logo SIPI"
                className="mx-auto h-[100px] w-[100px] max-w-none scale-[1.35] object-contain"
              />
              <span
                aria-hidden="true"
                className="sipi-logo-sheen pointer-events-none absolute inset-y-[-20%] left-[-35%] w-[48%] bg-gradient-to-r from-transparent via-primary/45 to-transparent blur-[1px]"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-wide text-foreground">Bem-vindo ao SIPI</h1>
            <p className="text-xs text-muted-foreground mt-1">Sistema de Inquéritos Policiais</p>
            <p className="text-[10px] text-muted-foreground/80 mt-1 tracking-wider uppercase">
              DT Itabela · 23ª COORPIN
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="usuario"
                className="text-xs tracking-wider uppercase text-muted-foreground font-semibold"
              >
                E-mail ou login
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="usuario"
                  autoComplete="username"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="Digite seu e-mail ou login"
                  className="pl-9 h-11 bg-background/60 border-border focus-visible:ring-primary"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="senha"
                className="text-xs tracking-wider uppercase text-muted-foreground font-semibold"
              >
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="senha"
                  type={showSenha ? "text" : "password"}
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha"
                  className="pl-9 pr-10 h-11 bg-background/60 border-border focus-visible:ring-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSenha((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors"
                  aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {postSignupMessage && (
              <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-xs text-primary">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{postSignupMessage}</span>
              </div>
            )}

            {erro && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{erro}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-[0.15em] uppercase text-xs"
            >
              {loading ? (
                "Verificando…"
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" /> Entrar
                </>
              )}
            </Button>

            <p className="text-center text-[10px] text-muted-foreground leading-relaxed">
              Uso exclusivo de servidores autorizados.
              <br />
              Acessos são monitorados e registrados em auditoria.
            </p>

            <p className="text-xs text-center">
              Não tem conta?{" "}
              <Link to="/criar-conta" className="underline">
                Criar conta
              </Link>
            </p>
          </form>

          <div className="px-8 py-3 border-t border-border bg-muted/20 text-center text-[10px] text-muted-foreground tracking-wider">
            © 2026 Polícia Civil — Uso restrito a agentes autorizados
          </div>
        </div>
      </div>
    </div>
  );
}
