import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/localizacao/registros")({
  beforeLoad: () => {
    throw redirect({ to: "/localizacao" });
  },
});
