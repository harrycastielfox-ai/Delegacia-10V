import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { formatRepresentacaoId, loadRepresentacoes, saveRepresentacoes } from "@/lib/casesLocalState";

export const Route = createFileRoute("/representacoes/$representacaoId/editar")({ component: EditarRepresentacao });

function EditarRepresentacao() {
  const { representacaoId } = Route.useParams();
  const navigate = useNavigate();
  const current = loadRepresentacoes().find((r) => r.id === representacaoId);
  const [form, setForm] = useState(current);
  const [feedback, setFeedback] = useState("");
  if (!form) return <AppLayout>Representação não encontrada.</AppLayout>;
  const save = () => { saveRepresentacoes(loadRepresentacoes().map((r) => r.id === form.id ? form : r)); setFeedback("Representação atualizada localmente. Integração com banco será feita futuramente."); };
  return <AppLayout><div className="max-w-4xl space-y-4"><Link to="/representacoes/$representacaoId" params={{ representacaoId }} className="text-xs border border-border rounded-md px-3 py-1.5 inline-block">← Voltar aos detalhes</Link><h1 className="text-2xl font-bold">Editar Representação</h1><div><label className="text-xs text-muted-foreground">ID da representação</label><input readOnly value={formatRepresentacaoId(form.id)} className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm" /></div><div className="grid md:grid-cols-2 gap-3">{[["PPE relacionado","ppe"],["Nº Processo Judicial","processo"],["Tipo","tipo"],["Vítima","vitima"],["Investigado / Representado","investigado"],["Data","data"],["Status","status"]].map(([label,key])=><div key={String(key)}><label className="text-xs text-muted-foreground">{label}</label><input value={String((form as any)[key]??"")} onChange={(e)=>setForm((p)=>p?{...p,[key]:e.target.value}:p)} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm"/></div>)}</div>{feedback && <div className="text-sm text-success">{feedback}</div>}<div className="flex gap-2 justify-end"><button onClick={save} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Salvar alterações</button><button onClick={()=>navigate({to:'/representacoes/$representacaoId',params:{representacaoId:form.id}})} className="px-4 py-2 rounded-lg border border-border text-sm">Concluir</button></div></div></AppLayout>;
}
