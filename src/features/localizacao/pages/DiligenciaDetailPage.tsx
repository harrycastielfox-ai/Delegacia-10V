import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarClock,
  Camera,
  CarFront,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileBadge2,
  Fingerprint,
  MapPin,
  MapPinned,
  Pencil,
  Phone,
  Route,
  ShieldCheck,
  Smartphone,
  UserRound,
  UsersRound,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { AbrirNoMapa } from "@/components/AbrirNoMapa";
import {
  getDiligenciaById,
  getLocalizacaoPhotoSignedUrl,
} from "@/lib/repositories/localizacaoRepository";
import { DILIGENCIA_TIPO_LABELS, PESSOA_VINCULO_LABELS } from "../localizacaoConstants";
import type { DiligenciaDetalhe } from "../localizacaoTypes";
import { DiligenciaProgressTrail } from "../components/DiligenciaProgressTrail";
import { DiligenciaStatusBadge } from "../components/DiligenciaStatusBadge";

function formatDateTime(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDate(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatDistance(value: number | null) {
  if (value === null) return null;
  return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`;
}

function formatDuration(value: number | null) {
  if (value === null) return null;
  const minutes = Math.max(1, Math.round(value / 60));
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}min`
    : `${minutes} min`;
}

function InfoCell({ label, value }: { label: string; value: ReactNode }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="min-w-0 border-t border-border/80 py-3 first:border-t-0 first:pt-0">
      <dt className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`mt-1 break-words text-sm font-semibold ${empty ? "text-muted-foreground" : "text-foreground"}`}
      >
        {empty ? "Não informado" : value}
      </dd>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-border/80 bg-background/70 p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-operational/25 bg-operational/10 text-operational">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-black text-foreground">
          {value ?? "Não informado"}
        </p>
      </div>
    </div>
  );
}

function SectionHeading({
  icon,
  eyebrow,
  title,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border/80 px-4 py-3.5 sm:px-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-operational/25 bg-operational/10 text-operational">
        {icon}
      </span>
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-operational">
          {eyebrow}
        </p>
        <h2 className="mt-0.5 text-sm font-black text-foreground">{title}</h2>
      </div>
    </div>
  );
}

function PrivateImage({
  path,
  alt,
  className,
  fallback,
}: {
  path: string | null;
  alt: string;
  className: string;
  fallback: ReactNode;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUrl(null);
    void getLocalizacaoPhotoSignedUrl(path).then((value) => {
      if (active) setUrl(value);
    });
    return () => {
      active = false;
    };
  }, [path]);

  return url ? (
    <img src={url} alt={alt} loading="lazy" decoding="async" className={className} />
  ) : (
    fallback
  );
}

export default function DiligenciaDetailPage() {
  const { diligenciaId } = useParams({ strict: false }) as { diligenciaId: string };
  const [diligencia, setDiligencia] = useState<DiligenciaDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getDiligenciaById(diligenciaId)
      .then((record) => {
        if (!cancelled) setDiligencia(record);
      })
      .catch((cause) => {
        console.error("[DiligenciaDetailPage] Falha ao carregar a diligência", cause);
        if (!cancelled) setError("Não foi possível carregar esta diligência.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [diligenciaId]);

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center text-sm text-muted-foreground">
        Carregando ficha operacional...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center">
        <h1 className="text-lg font-bold text-destructive">{error}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Verifique a conexão e tente novamente.</p>
        <Link to="/localizacao/diligencias" className="mt-4 inline-block text-sm text-operational">
          Voltar para diligências
        </Link>
      </div>
    );
  }

  if (!diligencia) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <h1 className="text-xl font-bold">Diligência não encontrada</h1>
        <Link to="/localizacao/diligencias" className="mt-4 inline-block text-sm text-operational">
          Voltar para diligências
        </Link>
      </div>
    );
  }

  const address = diligencia.endereco;
  const person = diligencia.pessoa;
  const addressLine = address
    ? `${address.logradouro}, ${address.sem_numero ? "s/n" : (address.numero ?? "s/n")}`
    : "Endereço não informado";
  const addressDetails = address
    ? [address.complemento, address.bairro, `${address.municipio} - ${address.uf}`]
        .filter(Boolean)
        .join(" · ")
    : null;
  const coordinates =
    address?.latitude !== null &&
    address?.latitude !== undefined &&
    address.longitude !== null &&
    address.longitude !== undefined
      ? `${address.latitude.toFixed(6)}, ${address.longitude.toFixed(6)}`
      : null;

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/localizacao/diligencias"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground transition hover:text-operational"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para diligências
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/localizacao/diligencias/$diligenciaId/campo"
            params={{ diligenciaId }}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-operational/35 bg-operational/10 px-3.5 text-xs font-black text-operational transition hover:bg-operational/20"
          >
            <Smartphone className="h-4 w-4" /> Modo campo
          </Link>
          <Link
            to="/localizacao/diligencias/$diligenciaId/editar"
            params={{ diligenciaId }}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-operational px-4 text-xs font-black text-[var(--operational-contrast)] transition hover:brightness-110"
          >
            <Pencil className="h-4 w-4" /> Editar diligência
          </Link>
        </div>
      </div>

      <header className="relative overflow-hidden rounded-2xl border border-operational/25 bg-card shadow-[0_20px_70px_rgba(0,0,0,.28)]">
        <div className="pointer-events-none absolute -right-10 -top-24 h-96 w-72 opacity-[0.07] sm:right-6 sm:opacity-[0.1]">
          <img src="/sipi-badge.png" alt="" className="h-full w-full object-contain" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-operational to-transparent" />

        <div className="relative p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#d8bd68]/30 bg-black/25 p-2 shadow-[0_0_28px_rgba(216,189,104,.12)] sm:flex">
                <img
                  src="/sipi-badge.png"
                  alt="Brasão da Polícia Civil da Bahia"
                  className="h-full w-full object-contain"
                />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-operational">
                  Polícia Civil da Bahia · Delegacia Territorial de Itabela
                </p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Ficha operacional da diligência
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <h1 className="break-all font-mono text-2xl font-black sm:text-3xl">
                    {diligencia.codigo}
                  </h1>
                  <DiligenciaStatusBadge status={diligencia.status} />
                </div>
                <p className="mt-2 text-sm font-semibold text-muted-foreground">
                  {DILIGENCIA_TIPO_LABELS[diligencia.tipo]}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-background/65 px-4 py-3 backdrop-blur-sm lg:min-w-56">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Atualização do registro
              </p>
              <p className="mt-1 text-sm font-black">{formatDateTime(diligencia.updated_at)}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Uso interno e restrito</p>
            </div>
          </div>

          <div className="mt-6 border-t border-border/80 pt-5">
            <DiligenciaProgressTrail status={diligencia.status} />
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<MapPin className="h-4 w-4" />} label="Destino" value={addressLine} />
        <Metric
          icon={<UsersRound className="h-4 w-4" />}
          label="Equipe responsável"
          value={diligencia.equipe_nome}
        />
        <Metric
          icon={<CalendarClock className="h-4 w-4" />}
          label="Agendamento"
          value={formatDateTime(diligencia.agendada_para)}
        />
        <Metric
          icon={<CarFront className="h-4 w-4" />}
          label="Viatura"
          value={diligencia.viatura}
        />
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)]">
        <div className="min-w-0 space-y-4">
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <SectionHeading
              icon={<UserRound className="h-4 w-4" />}
              eyebrow="Pessoa vinculada"
              title="Identificação e dados pessoais"
            />

            {person ? (
              <div className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <PrivateImage
                    path={person.foto_perfil_path}
                    alt={`Fotografia de ${person.nome}`}
                    className="h-28 w-28 shrink-0 rounded-2xl border border-operational/30 object-cover shadow-[0_0_28px_color-mix(in_oklab,var(--operational)_16%,transparent)]"
                    fallback={
                      <span className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border border-operational/30 bg-operational/10 text-operational">
                        <UserRound className="h-10 w-10" />
                      </span>
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex rounded-full border border-operational/35 bg-operational/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-operational">
                      {PESSOA_VINCULO_LABELS[person.vinculo]}
                    </span>
                    <h2 className="mt-2 break-words text-xl font-black sm:text-2xl">
                      {person.nome}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {person.apelido
                        ? `Conhecido como ${person.apelido}`
                        : "Sem apelido informado"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {person.telefone ? (
                        <a
                          href={`tel:${person.telefone.replace(/\D/g, "")}`}
                          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold transition hover:border-operational/35 hover:text-operational"
                        >
                          <Phone className="h-3.5 w-3.5" /> {person.telefone}
                        </a>
                      ) : null}
                      {person.numero_bo ? (
                        <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold">
                          <FileBadge2 className="h-3.5 w-3.5 text-operational" /> B.O.{" "}
                          {person.numero_bo}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-x-6 rounded-xl border border-border/80 bg-background/65 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  <dl>
                    <InfoCell label="CPF" value={person.cpf} />
                    <InfoCell label="RG" value={person.rg} />
                  </dl>
                  <dl>
                    <InfoCell label="Nascimento" value={formatDate(person.data_nascimento)} />
                    <InfoCell label="Nome da mãe" value={person.nome_mae} />
                  </dl>
                  <dl>
                    <InfoCell label="Procedimento" value={person.numero_procedimento} />
                    <InfoCell label="Telefone" value={person.telefone} />
                  </dl>
                </div>

                {person.observacoes ? (
                  <div className="mt-4 rounded-xl border border-warning/25 bg-warning/5 p-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-warning">
                      Observações sobre a pessoa
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                      {person.observacoes}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
                <UserRound className="h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold">Nenhuma pessoa vinculada.</p>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <SectionHeading
              icon={<ClipboardList className="h-4 w-4" />}
              eyebrow="Execução"
              title="Equipe, viatura e horários"
            />
            <div className="grid gap-x-6 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
              <dl>
                <InfoCell label="Tipo" value={DILIGENCIA_TIPO_LABELS[diligencia.tipo]} />
                <InfoCell label="Equipe" value={diligencia.equipe_nome} />
              </dl>
              <dl>
                <InfoCell label="Agentes" value={diligencia.equipe_agentes} />
                <InfoCell label="Viatura" value={diligencia.viatura} />
              </dl>
              <dl>
                <InfoCell label="Agendamento" value={formatDateTime(diligencia.agendada_para)} />
                <InfoCell label="Saída" value={formatDateTime(diligencia.saida_em)} />
              </dl>
              <dl>
                <InfoCell label="Chegada" value={formatDateTime(diligencia.chegada_em)} />
                <InfoCell label="Conclusão" value={formatDateTime(diligencia.concluida_em)} />
              </dl>
            </div>
          </section>

          {diligencia.resultado || diligencia.observacoes ? (
            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              <SectionHeading
                icon={<CheckCircle2 className="h-4 w-4" />}
                eyebrow="Encerramento"
                title="Resultado e observações da diligência"
              />
              <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
                <div className="rounded-xl border border-success/25 bg-success/5 p-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-success">
                    Resultado
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                    {diligencia.resultado ?? "Não informado"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Observações
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                    {diligencia.observacoes ?? "Não informado"}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <SectionHeading
              icon={<Camera className="h-4 w-4" />}
              eyebrow="Evidências"
              title={`Registros fotográficos (${diligencia.fotos.length})`}
            />
            {diligencia.fotos.length ? (
              <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
                {diligencia.fotos.map((photo) => (
                  <article
                    key={photo.id}
                    className="overflow-hidden rounded-xl border border-border bg-background"
                  >
                    <PrivateImage
                      path={photo.storage_path}
                      alt={photo.legenda ?? "Registro fotográfico da diligência"}
                      className="aspect-video w-full object-cover"
                      fallback={
                        <span className="flex aspect-video items-center justify-center bg-muted text-muted-foreground">
                          <Camera className="h-8 w-8" />
                        </span>
                      }
                    />
                    <div className="p-3">
                      <strong className="block truncate text-xs">
                        {photo.legenda ?? "Registro sem legenda"}
                      </strong>
                      <span className="mt-1 block text-[10px] text-muted-foreground">
                        {formatDateTime(photo.capturada_em)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex min-h-32 flex-col items-center justify-center p-6 text-center">
                <Camera className="h-7 w-7 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Nenhuma fotografia anexada.</p>
              </div>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
          <section className="overflow-hidden rounded-2xl border border-operational/25 bg-card shadow-[0_18px_55px_rgba(0,0,0,.22)]">
            <SectionHeading
              icon={<MapPinned className="h-4 w-4" />}
              eyebrow="Local da operação"
              title="Endereço e orientação de campo"
            />
            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-operational/30 bg-operational/10 text-operational">
                  <MapPin className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="break-words text-lg font-black">{addressLine}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {addressDetails ?? "Localidade não informada"}
                  </p>
                  {address?.confirmado ? (
                    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-success">
                      <ShieldCheck className="h-3.5 w-3.5" /> Local confirmado
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid gap-x-5 rounded-xl border border-border/80 bg-background/65 p-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <dl>
                  <InfoCell label="CEP" value={address?.cep} />
                  <InfoCell label="Coordenadas" value={coordinates} />
                </dl>
                <dl>
                  <InfoCell label="Ponto de referência" value={address?.ponto_referencia} />
                  <InfoCell label="Complemento" value={address?.complemento} />
                </dl>
              </div>

              {address?.como_chegar ? (
                <div className="mt-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-warning">
                    Como chegar
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                    {address.como_chegar}
                  </p>
                </div>
              ) : null}

              {address?.observacoes ? (
                <div className="mt-3 rounded-xl border border-border bg-background p-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Observações do endereço
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                    {address.observacoes}
                  </p>
                </div>
              ) : null}

              {address ? (
                <div className="mt-4 border-t border-border pt-4">
                  <AbrirNoMapa
                    size="md"
                    urlManual={address.maps_url}
                    className="[&_a]:min-h-11 [&_a]:flex-1 [&_a]:justify-center"
                    target={{
                      endereco: addressLine,
                      latitude: address.latitude,
                      longitude: address.longitude,
                      cidade: `${address.municipio}, ${address.uf}`,
                    }}
                  />
                </div>
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <SectionHeading
              icon={<Route className="h-4 w-4" />}
              eyebrow="Deslocamento"
              title="Rota e confirmação de chegada"
            />
            <div className="grid gap-x-5 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-1 2xl:grid-cols-2">
              <dl>
                <InfoCell label="Distância" value={formatDistance(diligencia.distancia_metros)} />
                <InfoCell
                  label="Duração estimada"
                  value={formatDuration(diligencia.duracao_segundos)}
                />
              </dl>
              <dl>
                <InfoCell label="Saída" value={formatDateTime(diligencia.saida_em)} />
                <InfoCell label="Chegada" value={formatDateTime(diligencia.chegada_em)} />
              </dl>
            </div>
            {diligencia.chegada ? (
              <div className="mx-4 mb-4 rounded-xl border border-success/25 bg-success/5 p-4 sm:mx-5 sm:mb-5">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="text-[9px] font-black uppercase tracking-[0.16em]">
                    Chegada confirmada por GPS
                  </p>
                </div>
                <p className="mt-2 font-mono text-xs font-bold">
                  {diligencia.chegada.latitude.toFixed(6)},{" "}
                  {diligencia.chegada.longitude.toFixed(6)}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {formatDateTime(diligencia.chegada.registrada_em)}
                  {diligencia.chegada.precisao_metros !== null
                    ? ` · precisão aproximada de ${Math.round(diligencia.chegada.precisao_metros)} m`
                    : ""}
                </p>
              </div>
            ) : (
              <div className="mx-4 mb-4 flex items-center gap-3 rounded-xl border border-border bg-background p-4 text-muted-foreground sm:mx-5 sm:mb-5">
                <Clock3 className="h-4 w-4 shrink-0" />
                <p className="text-xs font-semibold">Chegada ainda não confirmada em campo.</p>
              </div>
            )}
          </section>

          <div className="flex items-center gap-2 rounded-xl border border-[#d8bd68]/20 bg-[#d8bd68]/5 p-3 text-[10px] text-muted-foreground">
            <Fingerprint className="h-4 w-4 shrink-0 text-[#d8bd68]" />
            Documento operacional com informações pessoais e de localização protegidas.
          </div>
        </aside>
      </div>
    </div>
  );
}
