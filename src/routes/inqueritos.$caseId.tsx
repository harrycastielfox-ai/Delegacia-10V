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

  const badges = [caso.prioridade, caso.statusDiligencias, caso.gravidade, caso.tipo, caso.autorDeterminado === "Sim" ? "Elucidado" : "Não elucidado"];

  return <AppLayout><div className="space-y-6">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Link to="/inqueritos" className="rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-accent">←</Link>
          <h1 className="text-4xl font-black leading-none">{caso.id}</h1>
        </div>
        <p className="text-xl text-muted-foreground">{caso.tipificacao}</p>
        <p className="text-sm text-muted-foreground">Última edição: <span className="text-foreground font-semibold">{caso.ultimaAtualizacao ?? "não registrada"}</span></p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => window.print()} className="px-4 py-2.5 text-sm rounded-lg border border-border bg-card hover:bg-accent">Gerar PDF</button>
        <button onClick={() => navigate({ to: "/inqueritos/$caseId/editar", params: { caseId: caso.id } })} className="px-4 py-2.5 text-sm rounded-lg bg-primary text-primary-foreground font-semibold">Editar</button>
        <button onClick={remove} className="px-4 py-2.5 text-sm rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">Excluir</button>
      </div>
    </header>

    <div className="flex flex-wrap gap-2">{badges.map((badge) => <span key={badge} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold">{badge}</span>)}</div>

    <section className="grid gap-4 xl:grid-cols-2">
      {[
        ["Dados Gerais", [["Nº PPE", caso.ppe], ["Nº físico", caso.numeroFisico], ["Nº BO", caso.numeroBo], ["Data instauração", caso.dataInstauracao], ["Data do fato", caso.dataFato], ["Prazo", caso.prazo], ["Dias decorridos", `${caso.diasCorridos}`]]],
        ["Classificação", [["Tipificação", caso.tipificacao], ["Gravidade", caso.gravidade], ["Tipo", caso.tipo], ["Prioridade", caso.prioridade], ["Elucidado", caso.autorDeterminado], ["Arma utilizada", caso.motivacao]]],
        ["Pessoas Envolvidas", [["Vítima", caso.vitima], ["Suspeito", caso.autorInvestigado], ["Réu preso", caso.reuPreso ? "Sim" : "Não"]]],
        ["Dados Operacionais", [["Delegado responsável", caso.escrivao], ["Equipe", caso.equipeResponsavel], ["Situação", caso.situacao], ["Status diligências", caso.statusDiligencias], ["Bairro / distrito", caso.bairroDistrito], ["Facção", caso.nomeFaccao || "—"]]],
      ].map(([title, items]) => <article key={String(title)} className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm tracking-[0.2em] text-primary font-bold uppercase mb-5">{String(title)}</h2>
        <div className="grid gap-5 sm:grid-cols-2">{(items as string[][]).map(([k, v]) => <div key={k}><p className="text-[11px] tracking-[0.15em] uppercase text-muted-foreground">{k}</p><p className="mt-1 text-2xl leading-tight">{v || "—"}</p></div>)}</div>
      </article>)}
    </section>
  </div></AppLayout>;
}
