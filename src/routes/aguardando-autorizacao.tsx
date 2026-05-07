import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth";

export const Route = createFileRoute("/aguardando-autorizacao")({ component: PendingAuthorizationPage });

function PendingAuthorizationPage() {
  const navigate = useNavigate();
  return <div className="min-h-screen flex items-center justify-center p-4"><div className="max-w-md border rounded-xl p-6 space-y-4 bg-card">
    <h1 className="text-xl font-bold">Sua conta está aguardando autorização.</h1>
    <p className="text-sm text-muted-foreground">Conta criada com sucesso. Aguarde autorização de um administrador para acessar o SIPI.</p>
    <Button onClick={async ()=>{await logout(); navigate({to:"/login"});}}>Sair</Button>
  </div></div>;
}
