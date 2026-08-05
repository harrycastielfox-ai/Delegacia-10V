import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/localizacao/mapa")({
  beforeLoad: () => {
    throw redirect({ to: "/localizacao" });
  },
});
