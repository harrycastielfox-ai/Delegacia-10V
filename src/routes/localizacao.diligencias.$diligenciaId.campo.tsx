import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { LocalizacaoRouteFallback } from "@/features/localizacao/components/LocalizacaoRouteFallback";

const DiligenciaCampoPage = lazy(() => import("@/features/localizacao/pages/DiligenciaCampoPage"));

export const Route = createFileRoute("/localizacao/diligencias/$diligenciaId/campo")({
  component: () => (
    <Suspense fallback={<LocalizacaoRouteFallback />}>
      <DiligenciaCampoPage />
    </Suspense>
  ),
});
