import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria — SIPI" }] }),
  component: Auditoria,
});

function Auditoria() {
  return (
    <AppLayout>
      <PageHeader title="Auditoria" subtitle="Módulo temporariamente indisponível" showActions={false} />

      <div className="bg-card border border-border rounded-xl p-6 md:p-8">
        <h2 className="text-lg font-semibold text-foreground">Auditoria em desenvolvimento</h2>
        <p className="mt-2 text-sm text-muted-foreground">Este módulo será liberado em uma etapa futura.</p>

        <div className="mt-6 flex gap-3">
          <Link
            to="/modulos"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Voltar para módulos
          </Link>
          <Link
            to="/"
            className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
          >
            Ir para Dashboard
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
