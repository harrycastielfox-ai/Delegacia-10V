import { describe, expect, it } from "vitest";
import { parseCoordinateInput } from "./coordinateParser";

describe("parseCoordinateInput", () => {
  it("aceita coordenadas decimais de Itabela", () => {
    expect(parseCoordinateInput("-16.573", "latitude")).toBe(-16.573);
    expect(parseCoordinateInput("-39.48", "longitude")).toBe(-39.48);
  });

  it("aceita vírgula decimal", () => {
    expect(parseCoordinateInput("-16,573", "latitude")).toBe(-16.573);
  });

  it("mantém campo vazio como coordenada opcional", () => {
    expect(parseCoordinateInput("", "latitude")).toBeNull();
  });

  it("rejeita latitude fora do intervalo", () => {
    expect(() => parseCoordinateInput("1642", "latitude")).toThrow(/-90 a 90/);
  });

  it("rejeita longitude fora do intervalo", () => {
    expect(() => parseCoordinateInput("3900", "longitude")).toThrow(/-180 a 180/);
  });
});
