import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { loadInqueritos, saveInqueritos } from "@/lib/casesLocalState";

export const Route = createFileRoute("/inqueritos/$caseId/editar")({ component: EditarInquerito });

function EditarInquerito() {
  const { caseId } = Route.useParams();
  const navigate = useNavigate();
  const caso = loadInqueritos().find((item) => item.id === caseId);
  const [form, setForm] = useState(caso);
  const [feedback, setFeedback] = useState("");
  if (!form) return <AppLayout>Inquérito não encontrado.</AppLayout>;
  const save = () => { const next = loadInqueritos().map((item) => item.id === form.id ? form : item); saveInqueritos(next); setFeedback("Inquérito atualizado localmente. Integração com banco será feita futuramente."); };
  return <AppLayout><div className="max-w-4xl space-y-4"><Link to="/inqueritos/$caseId" params={{ caseId }} className="text-xs border border-border rounded-md px-3 py-1.5 inline-block">← Voltar aos detalhes</Link><h1 className="text-2xl font-bold">Editar Inquérito {form.id}</h1><div className="grid md:grid-cols-2 gap-3">{[["Tipificação","tipificacao"],["Prioridade","prioridade"],["Status diligências","statusDiligencias"],["Bairro / distrito","bairroDistrito"],["Equipe","equipeResponsavel"],["Escrivão","escrivao"],["Observações","observacoes"]].map(([label,key])=><div key={String(key)}><label className="text-xs text-muted-foreground">{label}</label><input value={String((form as any)[key]??"")} onChange={(e)=>setForm((p)=>p?{...p,[key]:e.target.value}:p)} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm"/></div>)}</div>{feedback && <div className="text-sm text-success">{feedback}</div>}<div className="flex gap-2 justify-end"><button onClick={save} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Salvar alterações</button><button onClick={()=>navigate({to:"/inqueritos/$caseId",params:{caseId:form.id}})} className="px-4 py-2 rounded-lg border border-border text-sm">Concluir</button></div></div></AppLayout>;
}
