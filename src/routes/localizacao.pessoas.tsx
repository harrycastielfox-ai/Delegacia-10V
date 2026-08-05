import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { LocalizacaoRouteFallback } from "@/features/localizacao/components/LocalizacaoRouteFallback";

const PessoasPage = lazy(() => import("@/features/localizacao/pages/PessoasPage"));

export const Route = createFileRoute("/localizacao/pessoas")({
  component: () => (
    <Suspense fallback={<LocalizacaoRouteFallback />}>
      <PessoasPage />
    </Suspense>
  ),
});
