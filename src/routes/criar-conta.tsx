import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpUser } from "@/lib/auth";

export const Route = createFileRoute("/criar-conta")({ component: CreateAccountPage });

function CreateAccountPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await signUpUser({ nome, email, login, password: senha, avatarUrl: avatarUrl || null });
      setSuccess("Conta criada com sucesso. Aguarde autorização de um administrador para acessar o SIPI.");
      setNome(""); setEmail(""); setLogin(""); setSenha(""); setAvatarUrl("");
    } catch (err: any) {
      setError(err?.message?.includes("duplicate") ? "E-mail ou login já cadastrado." : "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="min-h-screen flex items-center justify-center p-4">
    <form onSubmit={handleSubmit} className="w-full max-w-md bg-card border rounded-xl p-6 space-y-4">
      <h1 className="text-xl font-bold">Criar conta</h1>
      <Field label="Nome completo" value={nome} onChange={setNome} />
      <Field label="E-mail" value={email} onChange={setEmail} type="email" />
      <Field label="Login" value={login} onChange={setLogin} />
      <Field label="Senha" value={senha} onChange={setSenha} type="password" />
      <Field label="Avatar URL (opcional)" value={avatarUrl} onChange={setAvatarUrl} required={false} />
      {error ? <div className="text-xs text-destructive flex gap-2"><AlertCircle className="h-4 w-4" />{error}</div> : null}
      {success ? <div className="text-xs text-success">{success}</div> : null}
      <Button className="w-full" disabled={loading}>{loading ? "Criando..." : "Criar conta"}</Button>
      <p className="text-xs text-center"><Link to="/login" className="underline">Voltar para login</Link></p>
    </form>
  </div>;
}

function Field({label, value, onChange, type = "text", required = true}: {label:string;value:string;onChange:(value:string)=>void;type?:string;required?:boolean;}) {
  return <div className="space-y-1"><Label>{label}</Label><Input value={value} onChange={(e)=>onChange(e.target.value)} type={type} required={required} /></div>;
}
