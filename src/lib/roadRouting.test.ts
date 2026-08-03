import { describe, expect, it } from "vitest";
import { parseRoadRoute } from "./roadRouting";

describe("parseRoadRoute", () => {
  it("converte a geometria GeoJSON do OSRM para latitude e longitude", () => {
    expect(
      parseRoadRoute({
        code: "Ok",
        routes: [
          {
            distance: 1250.5,
            duration: 240,
            geometry: {
              type: "LineString",
              coordinates: [
                [-39.561971, -16.574782],
                [-39.562507, -16.57414],
              ],
            },
          },
        ],
      }),
    ).toEqual({
      points: [
        { latitude: -16.574782, longitude: -39.561971 },
        { latitude: -16.57414, longitude: -39.562507 },
      ],
      distanceMeters: 1250.5,
      durationSeconds: 240,
    });
  });

  it("rejeita respostas sem rota viária válida", () => {
    expect(parseRoadRoute({ code: "NoRoute", routes: [] })).toBeNull();
    expect(parseRoadRoute({ code: "Ok", routes: [] })).toBeNull();
  });
});
