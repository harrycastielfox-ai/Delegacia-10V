export function LocalizacaoRouteFallback() {
  return (
    <div
      className="min-h-[45vh] animate-pulse space-y-5"
      aria-label="Carregando módulo de localização operacional"
    >
      <div className="space-y-2">
        <div className="h-3 w-36 rounded bg-operational/15" />
        <div className="h-8 w-72 max-w-full rounded bg-muted" />
        <div className="h-4 w-96 max-w-full rounded bg-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-32 rounded-xl border border-border bg-card" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_360px]">
        <div className="h-96 rounded-xl border border-border bg-muted" />
        <div className="h-96 rounded-xl border border-border bg-card" />
      </div>
    </div>
  );
}
