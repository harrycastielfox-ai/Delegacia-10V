import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { LocalizacaoRouteFallback } from "@/features/localizacao/components/LocalizacaoRouteFallback";

const DiligenciaDetailPage = lazy(
  () => import("@/features/localizacao/pages/DiligenciaDetailPage"),
);

export const Route = createFileRoute("/localizacao/diligencias/$diligenciaId/")({
  component: () => (
    <Suspense fallback={<LocalizacaoRouteFallback />}>
      <DiligenciaDetailPage />
    </Suspense>
  ),
});
