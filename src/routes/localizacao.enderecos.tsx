import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { LocalizacaoRouteFallback } from "@/features/localizacao/components/LocalizacaoRouteFallback";

const EnderecosPage = lazy(() => import("@/features/localizacao/pages/EnderecosPage"));

export const Route = createFileRoute("/localizacao/enderecos")({
  component: () => (
    <Suspense fallback={<LocalizacaoRouteFallback />}>
      <EnderecosPage />
    </Suspense>
  ),
});
