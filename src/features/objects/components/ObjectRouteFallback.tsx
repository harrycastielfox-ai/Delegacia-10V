import { LoaderCircle } from "lucide-react";

export function ObjectRouteFallback() {
  return (
    <div className="flex min-h-[45vh] items-center justify-center text-warning">
      <LoaderCircle className="h-6 w-6 animate-spin" aria-label="Carregando módulo de objetos" />
    </div>
  );
}
