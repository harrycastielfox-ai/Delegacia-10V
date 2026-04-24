import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria — SIPI" }] }),
  component: Auditoria,
});

const logs = [
  { ts: "24/04/2026 09:05", user: "Del. Alves", action: "Criou inquérito", target: "IPL 2026.0001345-2" },
  { ts: "24/04/2026 08:47", user: "Esc. Souza", action: "Atualizou status", target: "IPL 2024.0001234-5" },
  { ts: "24/04/2026 08:30", user: "Del. Alves", action: "Anexou documento", target: "IPL 2024.0000987-1" },
  { ts: "23/04/2026 18:12", user: "Inv. Lima", action: "Encerrou inquérito", target: "IPL 2024.0000765-3" },
  { ts: "23/04/2026 16:45", user: "Esc. Souza", action: "Editou descrição", target: "IPL 2024.0001230-2" },
  { ts: "23/04/2026 14:20", user: "Del. Alves", action: "Reatribuiu equipe", target: "IPL 2024.0001229-9" },
];

function Auditoria() {
  return (
    <AppLayout>
      <PageHeader title="Auditoria" subtitle="Registro completo de ações no sistema" showActions={false} />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[10px] tracking-[0.15em] text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-bold">DATA / HORA</th>
              <th className="text-left px-4 py-3 font-bold">USUÁRIO</th>
              <th className="text-left px-4 py-3 font-bold">AÇÃO</th>
              <th className="text-left px-4 py-3 font-bold">ALVO</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={i} className="border-t border-border hover:bg-muted/20">
                <td className="px-4 py-3 text-muted-foreground tabular-nums">{l.ts}</td>
                <td className="px-4 py-3 font-semibold">{l.user}</td>
                <td className="px-4 py-3">{l.action}</td>
                <td className="px-4 py-3 font-mono text-xs text-primary">{l.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
