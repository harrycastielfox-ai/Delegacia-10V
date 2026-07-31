import { Outlet } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";

export default function VehiclesModuleFrame() {
  return (
    <AppLayout module="veiculos">
      <div className="vehicle-module min-h-full">
        <Outlet />
      </div>
    </AppLayout>
  );
}
