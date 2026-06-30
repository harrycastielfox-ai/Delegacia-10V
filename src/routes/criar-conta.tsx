import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { AlertCircle, BriefcaseBusiness, Camera, Lock, Mail, Phone, ShieldCheck, Upload, User, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpUser } from "@/lib/auth";
import type { InstitutionalFunction } from "@/lib/authz";

const MAX_AVATAR_MB = 2;
const MAX_AVATAR_BYTES = MAX_AVATAR_MB * 1024 * 1024;
const MAX_PHONE_DIGITS = 11;
const POST_SIGNUP_LOGIN_KEY = "sipi:post-signup-login";
const INSTITUTIONAL_FUNCTION_OPTIONS: Array<{ value: InstitutionalFunction; label: string }> = [
  { value: "juiz", label: "Juiz(a)" },
  { value: "delegado", label: "Delegado(a)" },
  { value: "escrivao", label: "Escrivão(ã)" },
  { value: "investigador", label: "Investigador(a)" },
  { value: "agente_policia", label: "Agente de Polícia" },
];

export const Route = createFileRoute("/criar-conta")({ component: CreateAccountPage });

function CreateAccountPage() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [funcaoInstitucional, setFuncaoInstitucional] = useState<InstitutionalFunction | "">("");
  const [email, setEmail] = useState("");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    if (!funcaoInstitucional) {
      setError("Selecione sua função institucional.");
      return;
    }
    setLoading(true);
    try {
      const cleanLogin = login.trim().toLowerCase();
      setLogin(cleanLogin);
      const result = await signUpUser({
        nome,
        email,
        login: cleanLogin,
        telefone,
        funcaoInstitucional,
        password: senha,
        avatarFile,
      });
      const message = result.avatarUploadWarning
        ? result.avatarUploadWarningReason === "NO_ACTIVE_SESSION"
          ? "Conta criada com sucesso. Aguarde autorização de um administrador para acessar o SIPI. A foto não foi salva agora porque não houve sessão ativa após o cadastro; você poderá adicionar a foto depois no perfil."
          : "Conta criada com sucesso. Aguarde autorização de um administrador para acessar o SIPI. Não foi possível salvar a foto de perfil neste momento; você poderá adicionar a foto depois no perfil."
        : "Conta criada com sucesso. Aguarde autorização de um administrador para acessar o SIPI.";

      sessionStorage.setItem(POST_SIGNUP_LOGIN_KEY, JSON.stringify({ login: cleanLogin, password: senha, message }));
      navigate({ to: "/login", replace: true });
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

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-4 py-8 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(34,197,94,0.08),transparent_34%,rgba(255,255,255,0.025)_68%,transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />

      <form onSubmit={handleSubmit} className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card/90 shadow-2xl shadow-black/35">
        <header className="border-b border-border bg-gradient-to-b from-primary/8 to-transparent px-6 pb-5 pt-6 text-center sm:px-8">
          <div className="mx-auto mb-3 flex h-[86px] w-[86px] items-center justify-center overflow-hidden rounded-xl border border-primary/25 bg-primary/10 p-2 shadow-[0_0_16px_rgba(34,197,94,0.16)]">
            <img src="/sipi-logo.png" alt="Logo SIPI" className="h-[96px] w-[96px] max-w-none scale-[1.28] object-contain" />
          </div>
          <div className="mb-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-primary/80">
            <span className="h-px w-8 bg-primary/35" />
            Cadastro institucional
            <span className="h-px w-8 bg-primary/35" />
          </div>
          <h1 className="text-2xl font-black tracking-wide text-foreground">SIPI</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sistema de Inquéritos Policiais</p>
        </header>

        <div className="space-y-6 px-5 py-6 sm:px-8">
          <section className="space-y-4">
            <SectionHeader icon={ShieldCheck} label="Dados de acesso" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="E-mail" value={email} onChange={setEmail} type="email" icon={Mail} autoComplete="email" />
              <Field
                label="Login"
                value={login}
                onChange={setLogin}
                onBlur={() => setLogin((prev) => prev.trim().toLowerCase())}
                icon={User}
                autoComplete="username"
                helper="Será utilizado para acessar o sistema."
              />
              <div className="sm:col-span-2">
                <Field label="Senha" value={senha} onChange={setSenha} type="password" icon={Lock} autoComplete="new-password" />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader icon={UserRound} label="Identificação" />
            <Field label="Nome completo" value={nome} onChange={setNome} icon={UserRound} autoComplete="name" />
            <InstitutionalFunctionSelect value={funcaoInstitucional} onChange={setFuncaoInstitucional} />
            <Field
              label="Telefone institucional (opcional)"
              value={formatPhone(telefone)}
              onChange={(value) => setTelefone(getPhoneDigits(value))}
              icon={Phone}
              autoComplete="tel"
              inputMode="numeric"
              required={false}
              helper="Use apenas números. Exemplo: (83) 99999-9999."
            />

            <div className="space-y-2">
              <Label>Foto de perfil</Label>
              <div
                className="flex cursor-pointer flex-col gap-4 rounded-xl border border-dashed border-primary/30 bg-background/45 p-4 transition hover:border-primary/50 hover:bg-primary/5 sm:flex-row sm:items-center"
                onDragOver={(event) => event.preventDefault()}
                onDrop={onDropAvatar}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="relative mx-auto h-20 w-20 shrink-0 overflow-hidden rounded-full border border-primary/35 bg-primary/10 shadow-[0_12px_28px_rgba(0,0,0,0.22)] sm:mx-0">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Pré-visualização do avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-primary">
                      <Camera className="h-7 w-7" aria-hidden="true" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
                  <div className="space-y-1">
                    <p className="truncate text-sm font-semibold text-foreground" title={avatarFile?.name}>{avatarFile ? avatarFile.name : "Adicionar foto institucional"}</p>
                    <p className="text-xs text-muted-foreground">Opcional. Pode ser alterada depois. Imagem até {MAX_AVATAR_MB}MB.</p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/35 bg-primary/10 px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/15"
                    onClick={(event) => {
                      event.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                    {avatarPreview ? "Trocar imagem" : "Selecionar imagem"}
                  </button>
                </div>

                <Input
                  ref={fileInputRef}
                  className="hidden"
                  type="file"
                  accept="image/*"
                  onChange={(event) => selectAvatar(event.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          </section>

          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}
          <div className="space-y-3">
            <Button className="h-11 w-full bg-primary text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground hover:bg-primary/90" disabled={loading}>
              {loading ? "Criando..." : "Criar conta"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Já possui acesso? <Link to="/login" className="font-semibold text-primary underline underline-offset-4">Voltar para login</Link>
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

function SectionHeader({ icon: Icon, label }: { icon: typeof ShieldCheck; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-lg border border-primary/25 bg-primary/10 p-1.5 text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    </div>
  );
}

function InstitutionalFunctionSelect({
  value,
  onChange,
}: {
  value: InstitutionalFunction | "";
  onChange: (value: InstitutionalFunction | "") => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Função institucional</Label>
      <div className="relative">
        <BriefcaseBusiness
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as InstitutionalFunction | "")}
          required
          className="h-11 w-full rounded-md border border-border bg-background/60 pl-9 pr-3 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
        >
          <option value="" disabled>
            Selecione sua função
          </option>
          {INSTITUTIONAL_FUNCTION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-muted-foreground">
        Usada para identificação operacional. Admin ou Delegado pode ajustar depois no perfil administrativo.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  type = "text",
  required = true,
  helper,
  icon: Icon,
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: string;
  required?: boolean;
  helper?: string;
  icon?: typeof User;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "search" | "email" | "url";
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        {Icon ? <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /> : null}
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          type={type}
          required={required}
          autoComplete={autoComplete}
          inputMode={inputMode}
          className={Icon ? "h-11 border-border bg-background/60 pl-9 focus-visible:ring-primary" : "h-11 border-border bg-background/60 focus-visible:ring-primary"}
        />
      </div>
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function getPhoneDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, MAX_PHONE_DIGITS);
}

function formatPhone(value: string) {
  const digits = getPhoneDigits(value);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
