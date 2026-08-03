import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { LocalizacaoRouteFallback } from "@/features/localizacao/components/LocalizacaoRouteFallback";

const LocalizacaoOverviewPage = lazy(
  () => import("@/features/localizacao/pages/LocalizacaoOverviewPage"),
);

export const Route = createFileRoute("/localizacao/")({
  component: () => (
    <Suspense fallback={<LocalizacaoRouteFallback />}>
      <LocalizacaoOverviewPage />
    </Suspense>
  ),
});
