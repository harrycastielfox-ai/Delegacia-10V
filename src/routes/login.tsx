import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { User, Lock, Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { isLoggedIn, login as doLogin } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Acesso Restrito — SIPI" },
      { name: "description", content: "Tela de autenticação do Sistema de Inquéritos Policiais." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Se já estiver logado, vai direto para os módulos.
  useEffect(() => {
    if (isLoggedIn()) {
      navigate({ to: "/modulos" });
    }
  }, [navigate]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);

    // Credencial fixa apenas para fluxo visual.
    // Será trocada por autenticação real em PHP + MySQL.
    setTimeout(() => {
      if (usuario === "Admin" && senha === "admin123") {
        doLogin();
        navigate({ to: "/modulos" });
      } else {
        setErro("Usuário ou senha inválidos.");
        setLoading(false);
      }
    }, 350);
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 py-10 relative overflow-hidden">
      {/* Brilho de fundo tático */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-success/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Faixa institucional */}
        <div className="mb-4 flex items-center justify-center gap-2 text-[10px] tracking-[0.25em] font-bold text-destructive">
          <span className="h-px w-8 bg-destructive/50" />
          ACESSO RESTRITO
          <span className="h-px w-8 bg-destructive/50" />
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          {/* Cabeçalho */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
            <div className="mx-auto h-16 w-16 rounded-xl bg-primary/15 border border-primary/30 shadow-[0_0_20px_rgba(34,197,94,0.20)] flex items-center justify-center mb-3 overflow-hidden">
              <img src="/sipi-logo.png" alt="Logo SIPI" className="h-10 w-10 object-contain" />
            </div>
            <h1 className="text-2xl font-bold tracking-wide text-foreground">SIPI</h1>
            <p className="text-xs text-muted-foreground mt-1">Sistema de Inquéritos Policiais</p>
            <p className="text-[10px] text-muted-foreground/80 mt-1 tracking-wider uppercase">
              DT Itabela · 23ª COORPIN
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="usuario" className="text-xs tracking-wider uppercase text-muted-foreground font-semibold">
                Usuário
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="usuario"
                  autoComplete="username"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="Digite seu usuário"
                  className="pl-9 h-11 bg-background/60 border-border focus-visible:ring-primary"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha" className="text-xs tracking-wider uppercase text-muted-foreground font-semibold">
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
          </form>

          <div className="px-8 py-3 border-t border-border bg-muted/20 text-center text-[10px] text-muted-foreground tracking-wider">
            © 2026 Polícia Civil — Uso restrito a agentes autorizados
          </div>
        </div>
      </div>
    </div>
  );
}
