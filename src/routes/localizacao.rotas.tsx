import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { LocalizacaoRouteFallback } from "@/features/localizacao/components/LocalizacaoRouteFallback";

const RotasPage = lazy(() => import("@/features/localizacao/pages/RotasPage"));

export const Route = createFileRoute("/localizacao/rotas")({
  component: () => (
    <Suspense fallback={<LocalizacaoRouteFallback />}>
      <RotasPage />
    </Suspense>
  ),
});
