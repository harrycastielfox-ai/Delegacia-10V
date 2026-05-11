import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { AlertCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpUser } from "@/lib/auth";

const MAX_AVATAR_MB = 2;
const MAX_AVATAR_BYTES = MAX_AVATAR_MB * 1024 * 1024;

export const Route = createFileRoute("/criar-conta")({ component: CreateAccountPage });

function CreateAccountPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function selectAvatar(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecione apenas arquivos de imagem para a foto de perfil.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError(`A foto deve ter no máximo ${MAX_AVATAR_MB}MB.`);
      return;
    }
    setError(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function onDropAvatar(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    selectAvatar(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const cleanLogin = login.trim().toLowerCase();
      setLogin(cleanLogin);
      const result = await signUpUser({ nome, email, login: cleanLogin, password: senha, avatarFile });
      if (result.avatarUploadWarning) {
        const warningMessage = result.avatarUploadWarningReason === "NO_ACTIVE_SESSION"
          ? "Conta criada com sucesso e aguarda autorização. A foto não foi salva agora porque não houve sessão ativa após o cadastro (ex.: confirmação de e-mail ativa). Você poderá adicionar a foto depois no perfil."
          : "Conta criada com sucesso e aguarda autorização. Não foi possível salvar a foto de perfil neste momento; você poderá adicionar a foto depois no perfil.";
        setSuccess(warningMessage);
      } else {
        setSuccess("Conta criada com sucesso. Aguarde autorização de um administrador para acessar o SIPI.");
      }
      setNome(""); setEmail(""); setLogin(""); setSenha(""); setAvatarFile(null); setAvatarPreview(null);
    } catch (err: any) {
      console.error("[CreateAccountPage] Erro ao criar conta", err);
      if (err?.message === "LOGIN_ALREADY_EXISTS") setError("Este login já está em uso.");
      else if (err?.message === "EMAIL_ALREADY_EXISTS") setError("Este e-mail já está em uso.");
      else if (err?.message === "LOGIN_REQUIRED") setError("Informe um login válido.");
      else if (err?.message === "AVATAR_INVALID_TYPE") setError("A foto precisa ser um arquivo de imagem válido.");
      else if (err?.message === "AVATAR_TOO_LARGE") setError(`A foto deve ter no máximo ${MAX_AVATAR_MB}MB.`);
      else if ((err?.message || "").toLowerCase().includes("already registered")) setError("Este e-mail já está em uso.");
      else if ((err?.message || "").toLowerCase().includes("database error saving new user")) setError("Não foi possível concluir o cadastro. Verifique se login/e-mail já existem ou se o trigger de perfil está configurado.");
      else setError("Não foi possível criar a conta. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="min-h-screen flex items-center justify-center p-4">
    <form onSubmit={handleSubmit} className="w-full max-w-md bg-card border rounded-xl p-6 space-y-4">
      <h1 className="text-xl font-bold">Criar conta</h1>
      <Field label="Nome completo" value={nome} onChange={setNome} />
      <Field label="E-mail" value={email} onChange={setEmail} type="email" />
      <Field label="Login" value={login} onChange={setLogin} onBlur={() => setLogin((prev) => prev.trim().toLowerCase())} />
      <Field label="Senha" value={senha} onChange={setSenha} type="password" />

      <div className="space-y-2">
        <Label>Foto de perfil (opcional)</Label>
        <div
          className="border border-dashed rounded-lg p-4 text-xs text-muted-foreground cursor-pointer"
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDropAvatar}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex items-center gap-2"><Upload className="h-4 w-4" />Clique para selecionar ou arraste uma imagem (máx. 2MB).</div>
          <Input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept="image/*"
            onChange={(event) => selectAvatar(event.target.files?.[0] ?? null)}
          />
        </div>
        {avatarPreview ? <img src={avatarPreview} alt="Pré-visualização do avatar" className="h-16 w-16 rounded-full object-cover border" /> : null}
      </div>

      {error ? <div className="text-xs text-destructive flex gap-2"><AlertCircle className="h-4 w-4" />{error}</div> : null}
      {success ? <div className="text-xs text-success">{success}</div> : null}
      <Button className="w-full" disabled={loading}>{loading ? "Criando..." : "Criar conta"}</Button>
      <p className="text-xs text-center"><Link to="/login" className="underline">Voltar para login</Link></p>
    </form>
  </div>;
}

function Field({label, value, onChange, onBlur, type = "text", required = true}: {label:string;value:string;onChange:(value:string)=>void;onBlur?:()=>void;type?:string;required?:boolean;}) {
  return <div className="space-y-1"><Label>{label}</Label><Input value={value} onChange={(e)=>onChange(e.target.value)} onBlur={onBlur} type={type} required={required} /></div>;
}
