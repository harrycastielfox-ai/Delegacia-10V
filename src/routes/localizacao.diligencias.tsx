import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/localizacao/diligencias")({
  component: Outlet,
});
