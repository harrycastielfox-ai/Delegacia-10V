import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/localizacao/diligencias/$diligenciaId")({
  component: Outlet,
});
