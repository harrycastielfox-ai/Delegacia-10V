import { CheckCircle2, House, Link2, MapPin, Plus, Search, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { createEndereco, listEnderecos } from "@/lib/repositories/localizacaoRepository";
import {
  BAIRROS_ITABELA,
  canonicalizarBairro,
  MUNICIPIO_PADRAO,
  UF_PADRAO,
} from "../localizacaoConstants";
import type { EnderecoRecord } from "../localizacaoTypes";

const fieldClass =
  "mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-operational/50";

export default function EnderecosPage() {
  const [searchInput, setSearchInput] = useState("");
  const [addresses, setAddresses] = useState<EnderecoRecord[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [noNumber, setNoNumber] = useState(false);
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState(MUNICIPIO_PADRAO);
  const [uf, setUf] = useState(UF_PADRAO);
  const [cep, setCep] = useState("");
  const [reference, setReference] = useState("");
  const [howToGetThere, setHowToGetThere] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void listEnderecos(searchInput).then((records) => {
        if (!cancelled) setAddresses(records);
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!street.trim() || !city.trim() || !uf.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      await createEndereco({
        logradouro: street.trim(),
        numero: noNumber ? null : number.trim() || null,
        sem_numero: noNumber,
        complemento: complement.trim() || null,
        bairro: canonicalizarBairro(neighborhood),
        municipio: city.trim(),
        uf: uf.trim().toUpperCase(),
        cep: cep.trim() || null,
        ponto_referencia: reference.trim() || null,
        como_chegar: howToGetThere.trim() || null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        maps_url: mapsUrl.trim() || null,
        confirmado: confirmed,
        observacoes: notes.trim() || null,
      });
      setAddresses(await listEnderecos(searchInput));
      setStreet("");
      setNumber("");
      setNoNumber(false);
      setComplement("");
      setNeighborhood("");
      setCity(MUNICIPIO_PADRAO);
      setUf(UF_PADRAO);
      setCep("");
      setReference("");
      setHowToGetThere("");
      setLatitude("");
      setLongitude("");
      setMapsUrl("");
      setConfirmed(false);
      setNotes("");
      setFormOpen(false);
      setMessage("Endereço cadastrado com sucesso.");
    } catch (error) {
      console.error("[EnderecosPage] Falha ao criar endereço", error);
      setMessage("Não foi possível cadastrar o endereço.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-operational">
            Cadastros operacionais
          </p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Endereços</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Locais de interesse e referências para futuras diligências.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-operational px-4 py-2.5 text-sm font-bold text-[var(--operational-contrast)]"
        >
          <Plus className="h-4 w-4" /> Novo endereço
        </button>
      </header>

      {message ? (
        <div className="mb-4 rounded-lg border border-operational/35 bg-operational/10 p-3 text-sm">
          {message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <label className="flex min-h-11 max-w-xl items-center gap-2 rounded-lg border border-border bg-background px-3 focus-within:border-operational/50">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar logradouro ou bairro"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
        </div>
        {addresses.length ? (
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {addresses.map((address) => (
              <article
                key={address.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-operational/30 bg-operational/10 text-operational">
                    <House className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-black">
                      {address.logradouro}, {address.sem_numero ? "s/n" : (address.numero ?? "s/n")}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[address.bairro, address.municipio, address.uf].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold ${address.confirmado ? "border-success/35 bg-success/10 text-success" : "border-warning/35 bg-warning/10 text-warning"}`}
                  >
                    {address.confirmado ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <MapPin className="h-3 w-3" />
                    )}
                    {address.confirmado ? "Local confirmado" : "Pendente de confirmação"}
                  </span>
                </div>
                {address.ponto_referencia ? (
                  <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                    {address.ponto_referencia}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="flex min-h-52 flex-col items-center justify-center p-6 text-center">
            <House className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Nenhum endereço encontrado.</p>
          </div>
        )}
      </section>

      {formOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-operational/35 bg-card p-5 shadow-[0_0_50px_color-mix(in_oklab,var(--operational)_16%,transparent)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-operational">
                  Novo cadastro
                </p>
                <h2 className="mt-1 text-xl font-black">Adicionar endereço</h2>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Logradouro <span className="text-destructive">*</span>
                </span>
                <input
                  value={street}
                  onChange={(event) => setStreet(event.target.value)}
                  className={fieldClass}
                  required
                />
              </label>
              <label>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Número
                </span>
                <input
                  value={number}
                  onChange={(event) => setNumber(event.target.value)}
                  disabled={noNumber}
                  className={fieldClass}
                />
              </label>
              <label className="flex min-h-11 items-center gap-2 self-end rounded-lg border border-border bg-background px-3 text-sm">
                <input
                  type="checkbox"
                  checked={noNumber}
                  onChange={(event) => setNoNumber(event.target.checked)}
                  className="accent-[var(--operational)]"
                />{" "}
                Sem número
              </label>
              <label>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Complemento
                </span>
                <input
                  value={complement}
                  onChange={(event) => setComplement(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Bairro
                </span>
                <input
                  value={neighborhood}
                  onChange={(event) => setNeighborhood(event.target.value)}
                  list="bairros-itabela-enderecos"
                  placeholder="Selecione ou informe o bairro"
                  className={fieldClass}
                />
                <datalist id="bairros-itabela-enderecos">
                  {BAIRROS_ITABELA.map((bairro) => (
                    <option key={bairro} value={bairro} />
                  ))}
                </datalist>
              </label>
              <label>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Município <span className="text-destructive">*</span>
                </span>
                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className={fieldClass}
                  required
                />
              </label>
              <label>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  UF <span className="text-destructive">*</span>
                </span>
                <input
                  maxLength={2}
                  value={uf}
                  onChange={(event) => setUf(event.target.value)}
                  className={fieldClass}
                  required
                />
              </label>
              <label>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  CEP
                </span>
                <input
                  value={cep}
                  onChange={(event) => setCep(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Latitude
                </span>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Longitude
                </span>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Link do Google Maps
                </span>
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-operational" />
                  <input
                    type="url"
                    value={mapsUrl}
                    onChange={(event) => setMapsUrl(event.target.value)}
                    placeholder="https://maps.google.com/..."
                    className={`${fieldClass} pl-10`}
                  />
                </div>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  Use quando a rua ainda não aparecer em serviços de busca.
                </span>
              </label>
              <label className="sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Ponto de referência
                </span>
                <input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Como chegar
                </span>
                <textarea
                  value={howToGetThere}
                  onChange={(event) => setHowToGetThere(event.target.value)}
                  rows={3}
                  placeholder="Explique do jeito que se fala: porteira azul à direita, 4 km depois do posto, terceira casa com pé de manga na frente."
                  className={`${fieldClass} min-h-24 resize-y leading-relaxed`}
                />
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  É o campo mais importante do cadastro — o que nenhum mapa tem. Também é por ele
                  que a busca encontra o local depois.
                </span>
              </label>
              <label className="sm:col-span-2 flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="accent-[var(--operational)]"
                />{" "}
                Local já confirmado em campo
              </label>
              <label className="sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Observações
                </span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className={`${fieldClass} py-3`}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-operational px-4 text-sm font-black text-[var(--operational-contrast)] disabled:opacity-60"
            >
              <MapPin className="h-5 w-5" /> {saving ? "Salvando..." : "Cadastrar endereço"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
