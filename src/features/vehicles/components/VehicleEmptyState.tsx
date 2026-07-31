import { CarFront } from "lucide-react";

export function VehicleEmptyState({ title = "Nenhum veículo encontrado" }: { title?: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-info/25 bg-info/10 text-info">
        <CarFront className="h-6 w-6" />
      </span>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ajuste a busca ou os filtros informados.
        </p>
      </div>
    </div>
  );
}
