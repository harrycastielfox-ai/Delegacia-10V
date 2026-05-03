import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { loadInqueritos, saveInqueritos } from "@/lib/casesLocalState";

export const Route = createFileRoute("/inqueritos/$caseId")({ component: InqueritoDetalhes });

function InqueritoDetalhes() {
  const { caseId } = Route.useParams();
  const navigate = useNavigate();
  const caso = loadInqueritos().find((item) => item.id === caseId);

  if (!caso) return <AppLayout><div className="space-y-4"><h1 className="text-xl font-bold">Inquérito não encontrado</h1><Link to="/inqueritos" className="px-4 py-2 border border-border rounded-lg inline-block">Voltar</Link></div></AppLayout>;

  const remove = () => {
    if (!confirm("Deseja remover este inquérito? No sistema final, esta ação deverá ser registrada em auditoria.")) return;
    saveInqueritos(loadInqueritos().filter((item) => item.id !== caso.id));
    navigate({ to: "/inqueritos", search: { feedback: "Inquérito removido localmente." } });
  };

  const getPrioridadeBadgeClass = (prioridade?: string) => {
    const valor = (prioridade || "").toLowerCase();
    if (valor === "alta") return "border-destructive/30 bg-destructive/10 text-destructive";
    if (valor === "média" || valor === "media") return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    if (valor === "baixa") return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    return "border-border bg-card text-foreground";
  };

  const getSituacaoBadgeClass = (situacao?: string) => {
    const valor = (situacao || "").toLowerCase();
    if (valor.includes("conclu")) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    if (valor.includes("instaurado") || valor.includes("andamento")) return "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300";
    if (valor.includes("pendente")) return "border-muted-foreground/30 bg-muted text-muted-foreground";
    return "border-border bg-card text-foreground";
  };

  const getGravidadeBadgeClass = (gravidade?: string) => {
    const valor = (gravidade || "").toLowerCase();
    if (valor.includes("cvli") || valor.includes("cyli")) return "border-destructive/30 bg-destructive/10 text-destructive";
    return "border-border bg-secondary text-secondary-foreground";
  };

  const getTipoBadgeClass = () => "border-border bg-secondary text-secondary-foreground";

  const getStatusBadgeClass = (status?: string) => {
    const valor = (status || "").toLowerCase();
    if (valor.includes("pendente")) return "border-muted-foreground/30 bg-muted text-muted-foreground";
    return "border-border bg-card text-foreground";
  };

  const getElucidacaoBadgeClass = (autorDeterminado?: string) => {
    const valor = (autorDeterminado || "").toLowerCase();
    if (valor === "sim") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    return "border-border bg-secondary text-secondary-foreground";
  };

  const badges = [
    { label: caso.prioridade, className: getPrioridadeBadgeClass(caso.prioridade) },
    { label: caso.situacao, className: getSituacaoBadgeClass(caso.situacao) },
    { label: caso.gravidade, className: getGravidadeBadgeClass(caso.gravidade) },
    { label: caso.tipo, className: getTipoBadgeClass() },
    { label: caso.statusDiligencias, className: getStatusBadgeClass(caso.statusDiligencias) },
    ...(caso.autorDeterminado ? [{ label: caso.autorDeterminado === "Sim" ? "Elucidado" : "Não elucidado", className: getElucidacaoBadgeClass(caso.autorDeterminado) }] : []),
  ].filter((badge) => Boolean(badge.label));

  return <AppLayout><div className="space-y-4">
    <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <Link to="/inqueritos" className="rounded-md border border-border bg-card px-2.5 py-1.5 text-sm hover:bg-accent">←</Link>
          <h1 className="text-2xl font-bold leading-tight">{caso.ppe || "Sem PPE"}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{caso.tipificacao || "Sem tipificação"}</p>
        <p className="text-xs text-muted-foreground">Última edição: <span className="text-foreground font-semibold">{caso.ultimaAtualizacao ?? "não registrada"}</span></p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => window.print()} className="px-3 py-1.5 text-xs rounded-md border border-border bg-card hover:bg-accent">Gerar PDF</button>
        <button onClick={() => navigate({ to: "/inqueritos/$caseId/editar", params: { caseId: caso.id } })} className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground font-semibold">Editar</button>
        <button onClick={remove} className="px-3 py-1.5 text-xs rounded-md border border-destructive/30 bg-destructive/10 text-destructive">Excluir</button>
      </div>
    </header>

    <div className="flex flex-wrap gap-1.5">{badges.map((badge) => <span key={badge.label} className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${badge.className}`}>{badge.label}</span>)}</div>

    <section className="grid gap-2.5 xl:grid-cols-2">
      {[
        ["Dados Gerais", [["ID interno", caso.id], ["Nº PPE", caso.ppe], ["Nº físico", caso.numeroFisico], ["Nº BO", caso.numeroBo], ["Data instauração", caso.dataInstauracao], ["Data do fato", caso.dataFato], ["Prazo", caso.prazo], ["Dias decorridos", `${caso.diasCorridos}`]]],
        ["Classificação", [["Tipificação", caso.tipificacao], ["Gravidade", caso.gravidade], ["Tipo", caso.tipo], ["Prioridade", caso.prioridade], ["Elucidado", caso.autorDeterminado], ["Arma utilizada", caso.armaUtilizada]]],
        ["Pessoas Envolvidas", [["Vítima", caso.vitima], ["Suspeito / investigado", caso.autorInvestigado], ["Réu preso", caso.reuPreso ? "Sim" : "Não"]]],
        ["Dados Operacionais", [["Situação", caso.situacao], ["Status diligências", caso.statusDiligencias], ["Delegado responsável", caso.delegadoResponsavel], ["Equipe", caso.equipeResponsavel], ["Escrivão", caso.escrivao], ["Bairro / distrito", caso.bairroDistrito], ["Facção", caso.nomeFaccao || "—"], ["Motivação", caso.motivacao || "—"]]],
      ].map(([title, items]) => <article key={String(title)} className="rounded-lg border border-border bg-card p-3.5 lg:p-4">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{String(title)}</h2>
        <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">{(items as string[][]).map(([k, v]) => <div key={k}><p className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground">{k}</p><p className="mt-0.5 text-sm leading-snug text-foreground">{v || "—"}</p></div>)}</div>
      </article>)}
    </section>
  </div></AppLayout>;
}
