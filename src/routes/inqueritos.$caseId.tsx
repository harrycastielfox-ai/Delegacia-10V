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

  const prazoVencido = caso.prazo && new Date(caso.prazo).getTime() < Date.now();
  const badges = [
    caso.prioridade,
    caso.statusDiligencias,
    caso.gravidade,
    caso.tipo,
    caso.autorDeterminado === "Sim" ? "Elucidado" : "Não elucidado",
    ...(prazoVencido ? ["VENCIDO"] : []),
  ].filter(Boolean);

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

    <div className="flex flex-wrap gap-1.5">{badges.map((badge) => <span key={badge} className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-semibold">{badge}</span>)}</div>

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
