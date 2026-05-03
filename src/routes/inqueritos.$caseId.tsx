import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { getInqueritoById, softDeleteInquerito, type InqueritoRecord } from "@/lib/repositories/inqueritosRepository";

export const Route = createFileRoute("/inqueritos/$caseId")({ component: InqueritoDetalhes });
function InqueritoDetalhes() {
  const { caseId } = Route.useParams(); const navigate = useNavigate();
  const [caso, setCaso] = useState<InqueritoRecord | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { (async()=>{ try { setCaso(await getInqueritoById(caseId)); } finally { setLoading(false);} })(); }, [caseId]);
  if (loading) return <AppLayout><div className="text-sm text-muted-foreground">Carregando…</div></AppLayout>;
  if (!caso) return <AppLayout><div className="space-y-4"><h1 className="text-xl font-bold">Inquérito não encontrado</h1><Link to="/inqueritos" className="px-4 py-2 border border-border rounded-lg inline-block">Voltar</Link></div></AppLayout>;
  const remove = async () => { if (!confirm("Deseja remover este inquérito?")) return; await softDeleteInquerito(caso.id); navigate({ to: "/inqueritos" }); };
  return <AppLayout><div className="space-y-4"><header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="space-y-1.5"><div className="flex items-center gap-2.5"><Link to="/inqueritos" className="rounded-md border border-border bg-card px-2.5 py-1.5 text-sm hover:bg-accent">←</Link><h1 className="text-2xl font-bold leading-tight">{caso.numero_ppe || "Sem PPE"}</h1></div><p className="text-sm text-muted-foreground">{caso.tipificacao || "Sem tipificação"}</p></div><div className="flex gap-2"><button onClick={() => window.print()} className="px-3 py-1.5 text-xs rounded-md border border-border bg-card hover:bg-accent">Gerar PDF</button><button onClick={() => navigate({ to: "/inqueritos/$caseId/editar", params: { caseId: caso.id } })} className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground font-semibold">Editar</button><button onClick={remove} className="px-3 py-1.5 text-xs rounded-md border border-destructive/30 bg-destructive/10 text-destructive">Excluir</button></div></header></div></AppLayout>
}
