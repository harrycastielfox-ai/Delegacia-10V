import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/localizacao/chegadas")({
  beforeLoad: () => {
    throw redirect({ to: "/localizacao" });
  },
});
