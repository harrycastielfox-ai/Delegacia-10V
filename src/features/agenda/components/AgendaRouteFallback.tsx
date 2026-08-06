import { LoaderCircle } from "lucide-react";

export function AgendaRouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoaderCircle className="h-6 w-6 animate-spin text-info" />
    </div>
  );
}
