import { createFileRoute } from "@tanstack/react-router";
import { LazyVehicleListRoute } from "@/features/vehicles/components/LazyVehicleListRoute";
import { VEHICLE_SITUATIONS } from "@/features/vehicles/vehicleTypes";
import type { VehicleSituation, VehicleSituationFilter } from "@/features/vehicles/vehicleTypes";

function parseSituation(value: unknown): VehicleSituationFilter | undefined {
  if (value === "nao_informada") return value;
  if (typeof value === "string" && VEHICLE_SITUATIONS.includes(value as VehicleSituation)) {
    return value as VehicleSituation;
  }
  return undefined;
}

function parseBoolean(value: unknown) {
  return value === true || value === "true" || value === "1" ? true : undefined;
}

/**
 * Filtros opcionais da listagem.
 *
 * As chaves precisam ser opcionais de verdade: se `validateSearch` devolvesse
 * sempre as duas (ainda que como `undefined`), o roteador passaria a exigir que
 * todo `<Link to="/veiculos/todos">` informasse ambas.
 */
type AllVehiclesSearch = {
  situation?: VehicleSituationFilter;
  pending?: boolean;
};

export const Route = createFileRoute("/veiculos/todos")({
  validateSearch: (search: Record<string, unknown>): AllVehiclesSearch => {
    const situation = parseSituation(search.situation);
    const pending = parseBoolean(search.pending);
    return {
      ...(situation ? { situation } : {}),
      ...(pending ? { pending } : {}),
    };
  },
  component: AllVehiclesRoute,
});

function AllVehiclesRoute() {
  const search = Route.useSearch();

  return (
    <LazyVehicleListRoute
      preset={{
        title: "Todos os Veículos",
        subtitle: "Consulta completa da base de veículos cadastrados.",
        initialSituation: search.situation,
        initialPendingIdentification: search.pending,
      }}
    />
  );
}
