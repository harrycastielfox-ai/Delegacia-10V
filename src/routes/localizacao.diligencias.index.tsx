import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { LocalizacaoRouteFallback } from "@/features/localizacao/components/LocalizacaoRouteFallback";

const DiligenciasPage = lazy(() => import("@/features/localizacao/pages/DiligenciasPage"));

export const Route = createFileRoute("/localizacao/diligencias/")({
  component: () => (
    <Suspense fallback={<LocalizacaoRouteFallback />}>
      <DiligenciasPage />
    </Suspense>
  ),
});
