import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { AlertTriangle, Bell, Clock, CalendarX } from "lucide-react";

export const Route = createFileRoute("/alertas")({
  head: () => ({ meta: [{ title: "Alertas — SIPI" }] }),
  component: Alertas,
});

const items = [
  { icon: AlertTriangle, tone: "destructive", title: "12 inquéritos vencidos", desc: "Prazo de conclusão expirado. Ação imediata necessária.", time: "Agora" },
  { icon: Clock, tone: "warning", title: "7 inquéritos sem atualização há mais de 15 dias", desc: "Equipes 1 e 2 com pendências.", time: "Há 2 horas" },
  { icon: CalendarX, tone: "purple", title: "23 inquéritos sem prazo definido", desc: "Defina datas-limite para acompanhamento.", time: "Há 4 horas" },
  { icon: Bell, tone: "info", title: "3 inquéritos próximos do vencimento (≤ 5 dias)", desc: "Confira a lista de casos críticos.", time: "Há 6 horas" },
];

const toneMap: Record<string, string> = {
  destructive: "var(--destructive)",
  warning: "var(--warning)",
  purple: "var(--purple)",
  info: "var(--info)",
};

function Alertas() {
  return (
    <AppLayout>
      <PageHeader title="Alertas" subtitle="Notificações operacionais em tempo real" showActions={false} />

      <div className="space-y-3 max-w-4xl">
        {items.map((a, i) => {
          const Icon = a.icon;
          const c = toneMap[a.tone];
          return (
            <div
              key={i}
              className="bg-card border rounded-xl p-4 flex items-start gap-4"
              style={{ borderColor: `color-mix(in oklab, ${c} 35%, var(--border))` }}
            >
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `color-mix(in oklab, ${c} 18%, transparent)`, color: c }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold" style={{ color: c }}>{a.title}</div>
                <div className="text-sm text-muted-foreground mt-1">{a.desc}</div>
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap">{a.time}</div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
