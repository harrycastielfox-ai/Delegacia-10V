import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getSession, signInWithLoginOrEmail } from "@/lib/auth";
import { isAuthorized } from "@/lib/authz";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const session = await getSession();
      if (session) navigate({ to: "/modulos" });
    })();
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null); setLoading(true);
    try {
      const profile = await signInWithLoginOrEmail(usuario, senha);
      if (!isAuthorized(profile)) {
        navigate({ to: "/aguardando-autorizacao" });
        return;
      }
      navigate({ to: "/modulos" });
    } catch (err: any) {
      if (err?.message === "LOGIN_NOT_FOUND") setErro("Usuário ou senha inválidos.");
      else if ((err?.message || "").toLowerCase().includes("invalid login")) setErro("Usuário ou senha inválidos.");
      else setErro("Falha no login. Verifique suas credenciais e permissões.");
    } finally { setLoading(false); }
  }

  return <div className="min-h-screen flex items-center justify-center p-4"><form onSubmit={handleSubmit} className="w-full max-w-md bg-card border rounded-xl p-6 space-y-4">
    <h1 className="text-xl font-bold">Acesso SIPI</h1>
    <div><Label>E-mail ou login</Label><Input value={usuario} onChange={(e)=>setUsuario(e.target.value)} required /></div>
    <div><Label>Senha</Label><Input type="password" value={senha} onChange={(e)=>setSenha(e.target.value)} required /></div>
    {erro ? <div className="text-xs text-destructive flex gap-2"><AlertCircle className="h-4 w-4" />{erro}</div> : null}
    <Button className="w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
    <p className="text-xs text-center">Não tem conta? <Link to="/criar-conta" className="underline">Criar conta</Link></p>
  </form></div>;
}
