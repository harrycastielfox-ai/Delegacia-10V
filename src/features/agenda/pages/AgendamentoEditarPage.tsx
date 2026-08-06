import { useParams } from "@tanstack/react-router";
import { AgendamentoFormPage } from "./AgendamentoFormPage";

export default function AgendamentoEditarPage() {
  const { agendamentoId } = useParams({ from: "/agenda/editar/$agendamentoId" });
  return <AgendamentoFormPage modo="edit" agendamentoId={agendamentoId} />;
}
