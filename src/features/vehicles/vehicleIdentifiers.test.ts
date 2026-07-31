import { describe, expect, it } from "vitest";
import {
  normalizeVehicleIdentifiers,
  statusForIdentifier,
  validateVehicleIdentifiers,
  type VehicleIdentifierInput,
} from "./vehicleIdentifiers";

const BASE_INPUT: VehicleIdentifierInput = {
  plate: "",
  plateStatus: "informado",
  renavam: "",
  renavamStatus: "informado",
  engineNumber: "",
  engineStatus: "informado",
  chassis: "",
  chassisStatus: "informado",
};

describe("identificadores de veículos", () => {
  it("normaliza placa, Renavam, motor e chassi", () => {
    expect(
      normalizeVehicleIdentifiers({
        ...BASE_INPUT,
        plate: "abc-1d23",
        renavam: "001.234.567-89",
        engineNumber: "mot-12 34",
        chassis: "9bw zzZ-377-vt004251",
      }),
    ).toEqual({
      plate: "ABC1D23",
      renavam: "00123456789",
      engineNumber: "MOT1234",
      chassis: "9BWZZZ377VT004251",
    });
  });

  it("marca como ausente o identificador vazio deixado como informado", () => {
    expect(statusForIdentifier("", "informado")).toBe("ausente");
    expect(statusForIdentifier("", "raspado")).toBe("raspado");
    expect(statusForIdentifier("ABC1D23", "informado")).toBe("informado");
  });

  it("valida comprimentos de placa e Renavam sem impedir cadastro incompleto", () => {
    expect(
      validateVehicleIdentifiers({ ...BASE_INPUT, plate: "ABC123", renavam: "12345678" }),
    ).toEqual([
      "A placa informada deve ter 7 caracteres.",
      "O Renavam informado deve ter entre 9 e 11 dígitos.",
    ]);
    expect(validateVehicleIdentifiers(BASE_INPUT)).toEqual([]);
  });
});
