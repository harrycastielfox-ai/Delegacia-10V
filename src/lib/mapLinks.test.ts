import { describe, expect, it } from "vitest";
import {
  buildMapDirectionsUrl,
  buildMapViewUrl,
  buildStreetViewEntryUrl,
  buildStreetViewUrl,
  buildWazeUrl,
  DEFAULT_ROUTE_ORIGIN,
  hasMapTarget,
  isDirectStreetViewUrl,
} from "./mapLinks";

describe("map links", () => {
  it("abre o local por texto acrescentando a cidade padrão", () => {
    const url = buildMapViewUrl({ endereco: "R. das Palmeiras, 87 — Centro" });
    expect(url).toBe(
      "https://www.google.com/maps/search/?api=1&query=R.+das+Palmeiras%2C+87+%E2%80%94+Centro%2C+Itabela%2C+BA",
    );
  });

  it("não duplica a cidade quando o endereço já a menciona", () => {
    const url = buildMapViewUrl({ endereco: "Av. Brasil, 1420 - itabela" });
    expect(url).toContain("query=Av.+Brasil%2C+1420+-+itabela");
    expect(url).not.toContain("Itabela%2C+BA");
  });

  it("prefere a coordenada quando ela existe", () => {
    const url = buildMapViewUrl({
      endereco: "Trav. São Jorge, s/n",
      latitude: -16.5721,
      longitude: -39.4863,
    });
    expect(url).toBe("https://www.google.com/maps/search/?api=1&query=-16.5721%2C-39.4863");
  });

  it("monta a navegação com modo dirigindo e sem origem fixa", () => {
    const url = buildMapDirectionsUrl({ latitude: -16.5721, longitude: -39.4863 });
    expect(url).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=-16.5721%2C-39.4863&travelmode=driving",
    );
  });

  it("aceita origem explícita na navegação", () => {
    const url = buildMapDirectionsUrl(
      { endereco: "Av. Brasil, 1420" },
      { origin: { endereco: "DT Itabela" } },
    );
    // A origem já cita a cidade, então não recebe o complemento; o destino sim.
    expect(url).toContain("origin=DT+Itabela&");
    expect(url).toContain("destination=Av.+Brasil%2C+1420%2C+Itabela%2C+BA");
  });

  it("só oferece Street View quando há coordenada", () => {
    expect(buildStreetViewUrl({ endereco: "R. Sete de Setembro, 233" })).toBeNull();
    expect(buildStreetViewUrl({ latitude: -16.5721, longitude: -39.4863 })).toBe(
      "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=-16.5721%2C-39.4863",
    );
  });

  it("prioriza o endereço textual exato antes de entrar no Street View", () => {
    const url = buildStreetViewEntryUrl({
      endereco: "Rua de Teste, 134",
      latitude: -16.57,
      longitude: -39.56,
    });

    expect(url).toBe(
      "https://www.google.com/maps/search/?api=1&query=Rua+de+Teste%2C+134%2C+Itabela%2C+BA",
    );
  });

  it("preserva um link que já aponta diretamente para um panorama", () => {
    const directUrl =
      "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=-16.57%2C-39.56";
    expect(isDirectStreetViewUrl(directUrl)).toBe(true);
    expect(buildStreetViewEntryUrl({ endereco: "Rua de Teste, 134" }, directUrl)).toBe(directUrl);
    expect(isDirectStreetViewUrl("https://maps.app.goo.gl/exemplo")).toBe(false);
  });

  it("mantém a delegacia como origem padrão exata", () => {
    expect(DEFAULT_ROUTE_ORIGIN).toMatchObject({
      endereco: "Delegacia Territorial de Itabela, Rua Castro Alves, 253",
      latitude: -16.574782,
      longitude: -39.561971,
    });
  });

  it("monta link do Waze por coordenada e por texto", () => {
    expect(buildWazeUrl({ latitude: -16.5721, longitude: -39.4863 })).toBe(
      "https://waze.com/ul?ll=-16.5721,-39.4863&navigate=yes",
    );
    expect(buildWazeUrl({ endereco: "Pátio da DT" })).toBe(
      "https://waze.com/ul?q=P%C3%A1tio%20da%20DT%2C%20Itabela%2C%20BA&navigate=yes",
    );
  });

  it("ignora coordenadas inválidas e cai para o texto", () => {
    const url = buildMapViewUrl({ endereco: "Pátio da DT", latitude: 0, longitude: 0 });
    expect(url).toContain("query=P%C3%A1tio+da+DT");

    expect(buildMapViewUrl({ endereco: "Pátio da DT", latitude: 91, longitude: -39 })).toContain(
      "query=P%C3%A1tio+da+DT",
    );
    expect(buildStreetViewUrl({ latitude: Number.NaN, longitude: -39.4863 })).toBeNull();
  });

  it("não gera link quando não há endereço nem coordenada", () => {
    expect(hasMapTarget({ endereco: "   " })).toBe(false);
    expect(hasMapTarget({ endereco: null, latitude: null, longitude: null })).toBe(false);
    expect(buildMapViewUrl({ endereco: "" })).toBeNull();
    expect(buildMapDirectionsUrl({ endereco: undefined })).toBeNull();
    expect(buildWazeUrl({})).toBeNull();
  });

  it("permite desligar a cidade padrão", () => {
    const url = buildMapViewUrl({ endereco: "Rodovia BR-101, km 812", cidade: null });
    expect(url).toBe("https://www.google.com/maps/search/?api=1&query=Rodovia+BR-101%2C+km+812");
  });
});
