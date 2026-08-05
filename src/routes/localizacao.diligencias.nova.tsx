import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { LocalizacaoRouteFallback } from "@/features/localizacao/components/LocalizacaoRouteFallback";

const DiligenciaFormPage = lazy(() => import("@/features/localizacao/pages/DiligenciaFormPage"));

export const Route = createFileRoute("/localizacao/diligencias/nova")({
  component: () => (
    <Suspense fallback={<LocalizacaoRouteFallback />}>
      <DiligenciaFormPage mode="create" />
    </Suspense>
  ),
});
