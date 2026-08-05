import { createFileRoute } from "@tanstack/react-router";
import { LazyObjectListRoute } from "@/features/objects/components/LazyObjectListRoute";
import { OBJECT_SITUATIONS, OBJECT_TYPES } from "@/features/objects/objectTypes";
import type {
  ObjectSituation,
  ObjectSituationFilter,
  ObjectType,
} from "@/features/objects/objectTypes";

function parseSituation(value: unknown): ObjectSituationFilter | undefined {
  if (value === "nao_informada") return value;
  if (typeof value === "string" && OBJECT_SITUATIONS.includes(value as ObjectSituation)) {
    return value as ObjectSituation;
  }
  return undefined;
}

function parseObjectType(value: unknown): ObjectType | undefined {
  if (typeof value === "string" && OBJECT_TYPES.includes(value as ObjectType)) {
    return value as ObjectType;
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
 * sempre todas (ainda que como `undefined`), o roteador passaria a exigir que
 * todo `<Link to="/objetos/todos">` as informasse — mesma armadilha corrigida
 * em `/veiculos/todos`.
 */
type AllObjectsSearch = {
  objectType?: ObjectType;
  situation?: ObjectSituationFilter;
  pending?: boolean;
  withoutProcedure?: boolean;
};

export const Route = createFileRoute("/objetos/todos")({
  validateSearch: (search: Record<string, unknown>): AllObjectsSearch => {
    const objectType = parseObjectType(search.objectType);
    const situation = parseSituation(search.situation);
    const pending = parseBoolean(search.pending);
    const withoutProcedure = parseBoolean(search.withoutProcedure);
    return {
      ...(objectType ? { objectType } : {}),
      ...(situation ? { situation } : {}),
      ...(pending ? { pending } : {}),
      ...(withoutProcedure ? { withoutProcedure } : {}),
    };
  },
  component: AllObjectsRoute,
});

function AllObjectsRoute() {
  const search = Route.useSearch();

  return (
    <LazyObjectListRoute
      preset={{
        initialObjectType: search.objectType,
        initialSituation: search.situation,
        initialPendingIdentification: search.pending,
        initialWithoutProcedure: search.withoutProcedure,
      }}
    />
  );
}
