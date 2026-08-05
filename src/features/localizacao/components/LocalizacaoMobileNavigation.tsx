import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { House, LogOut, Radar, Route as RouteIcon, UserRoundSearch } from "lucide-react";
import { useState } from "react";
import { AppearanceSwitcher } from "@/components/AppearanceSwitcher";
import { getProfileAvatarPublicUrl, logout } from "@/lib/auth";
import type { UserProfile } from "@/lib/authz";

const items = [
  { title: "Visão", url: "/localizacao", icon: Radar, exact: true },
  { title: "Diligências", url: "/localizacao/diligencias", icon: RouteIcon },
  { title: "Pessoas", url: "/localizacao/pessoas", icon: UserRoundSearch },
  { title: "Endereços", url: "/localizacao/enderecos", icon: House },
  { title: "Rotas", url: "/localizacao/rotas", icon: RouteIcon },
] as const;

export function LocalizacaoMobileNavigation({ profile }: { profile: UserProfile }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const avatarUrl = getProfileAvatarPublicUrl(profile.avatar_path);
  const initial = (profile.nome?.trim().charAt(0) || "?").toUpperCase();

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/95 px-3 backdrop-blur md:hidden">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between gap-2">
          <Link to="/localizacao" className="flex min-w-0 items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-operational/40 bg-operational/10 text-operational">
              <RouteIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <strong className="block truncate text-sm tracking-wide">LOCALIZAÇÃO</strong>
              <span className="block truncate text-[10px] text-muted-foreground">
                Operação em campo
              </span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <AppearanceSwitcher />
            <Link
              to="/perfil"
              aria-label="Abrir perfil"
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-operational/40 bg-operational/10 text-xs font-bold text-operational"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </Link>
            <button
              type="button"
              disabled={signingOut}
              onClick={async () => {
                if (signingOut) return;
                setSigningOut(true);
                try {
                  await logout();
                  navigate({ to: "/login", replace: true });
                } finally {
                  setSigningOut(false);
                }
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <nav
        aria-label="Navegação do módulo de localização"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="mx-auto grid min-h-16 max-w-lg grid-cols-5 items-stretch">
          {items.map((item) => {
            const active =
              "exact" in item && item.exact
                ? pathname === item.url
                : pathname === item.url || pathname.startsWith(`${item.url}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.url}
                to={item.url}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-semibold ${
                  active ? "text-operational" : "text-muted-foreground"
                }`}
              >
                {active ? (
                  <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-operational" />
                ) : null}
                <Icon className="h-5 w-5" />
                <span className="max-w-full truncate">{item.title}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
