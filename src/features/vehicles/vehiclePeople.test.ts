import { describe, expect, it } from "vitest";
import {
  createVehicleInvolvedPerson,
  formatVehicleInvolvedPeople,
  parseVehicleInvolvedPeople,
  serializeVehicleInvolvedPeople,
} from "./vehiclePeople";

describe("vehiclePeople", () => {
  it("serializa envolvidos com papel e observação", () => {
    const serialized = serializeVehicleInvolvedPeople([
      createVehicleInvolvedPerson("vitima", "Maria da Silva"),
      createVehicleInvolvedPerson("advogado", "João Souza", "OAB 1234"),
    ]);

    expect(serialized).toBe("(Vítima:) Maria da Silva\n(Advogado:) João Souza - OAB 1234");
  });

  it("restaura o formato estruturado salvo pelo formulário", () => {
    const people = parseVehicleInvolvedPeople(
      "(Vítima:) Maria da Silva\n(Advogado:) João Souza - OAB 1234",
    );

    expect(people).toMatchObject([
      { papel: "vitima", nome: "Maria da Silva", observacao: "" },
      { papel: "advogado", nome: "João Souza", observacao: "OAB 1234" },
    ]);
  });

  it("reconhece registros antigos separados por vírgula", () => {
    const people = parseVehicleInvolvedPeople(
      "Abraão Barbosa (Autor), Crispiniano Santos (Vítima), Patrick Oliveira (Autor) e Vanderson Silva (Autor)",
    );

    expect(people.map(({ papel, nome }) => ({ papel, nome }))).toEqual([
      { papel: "autor", nome: "Abraão Barbosa" },
      { papel: "vitima", nome: "Crispiniano Santos" },
      { papel: "autor", nome: "Patrick Oliveira" },
      { papel: "autor", nome: "Vanderson Silva" },
    ]);
  });

  it("preserva texto legado sem papel como outro envolvido", () => {
    const people = parseVehicleInvolvedPeople("Proprietário ainda não identificado");

    expect(people).toMatchObject([
      { papel: "outro", nome: "Proprietário ainda não identificado", observacao: "" },
    ]);
  });

  it("exibe registros antigos com o papel antes do nome", () => {
    const formatted = formatVehicleInvolvedPeople(
      "Abraão Barbosa (Autor), Maria da Silva (Vítima), João Souza (Advogado)",
    );

    expect(formatted).toBe(
      "(Autor:) Abraão Barbosa\n(Vítima:) Maria da Silva\n(Advogado:) João Souza",
    );
  });
});
