import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, FileText, FilePlus2, Bell, ShieldCheck, Shield, LogOut, Gavel } from "lucide-react";
import { logout } from "@/lib/auth";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Inquéritos", url: "/inqueritos", icon: FileText },
  { title: "Representações", url: "/representacoes", icon: Gavel },
  { title: "Novo Caso", url: "/novo-caso", icon: FilePlus2 },
  { title: "Alertas", url: "/alertas", icon: Bell, badge: 5 },
  { title: "Auditoria", url: "/auditoria", icon: ShieldCheck },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate({ to: "/login" });
  }

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
      <div className="px-5 py-5 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="font-bold text-sidebar-foreground tracking-wide">SIPI</div>
          <div className="text-xs text-muted-foreground -mt-0.5">Inquéritos Policiais</div>
        </div>
      </div>

      <div className="px-5 mt-4 mb-2 text-[10px] tracking-[0.2em] text-muted-foreground font-semibold">
        MÓDULOS
      </div>

      <nav className="px-3 flex-1 space-y-1">
        {items.map((item) => {
          const active = pathname === item.url;
          const Icon = item.icon;
          return (
            <Link
              key={item.url}
              to={item.url}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.title}</span>
              {"badge" in item && item.badge ? (
                <span className="text-[10px] font-semibold bg-destructive/20 text-destructive px-1.5 py-0.5 rounded">
                  {item.badge}
                </span>
              ) : null}
              {active && <span className="text-primary">›</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold text-primary">
          DA
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-sidebar-foreground truncate">DELEGADO ALVES</div>
          <div className="text-[10px] text-muted-foreground truncate">d.alves@policia.gov.br</div>
        </div>
        <button
          onClick={handleLogout}
          className="text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Sair"
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
      <div className="px-4 pb-3 text-[10px] text-muted-foreground">v2.0.0 · SIPI © 2026</div>
    </aside>
  );
}
