import { useParams } from "@tanstack/react-router";
import { ObjectFormPage } from "./ObjectFormPage";

export default function ObjectEditPage() {
  const { objectId } = useParams({ from: "/objetos/$objectId/editar" });
  return <ObjectFormPage mode="edit" objectId={objectId} />;
}
