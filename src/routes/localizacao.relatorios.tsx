import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/localizacao/relatorios")({
  beforeLoad: () => {
    throw redirect({ to: "/localizacao" });
  },
});
