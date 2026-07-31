import { describe, expect, it } from "vitest";
import {
  getMobileRouteRedirect,
  getPostAuthDestination,
  isMobilePathAllowed,
} from "./mobileExperience";

describe("mobile experience", () => {
  it("opens inquiries after authentication only on mobile", () => {
    expect(getPostAuthDestination(true)).toBe("/inqueritos");
    expect(getPostAuthDestination(false)).toBe("/modulos");
  });

  it.each([
    "/login",
    "/criar-conta",
    "/aguardando-autorizacao",
    "/inqueritos",
    "/inqueritos/case-1",
    "/inqueritos/case-1/editar",
    "/novo-caso",
    "/representacoes",
    "/representacoes/rep-1",
    "/nova-representacao",
    "/admin/usuarios",
    "/admin/usuarios/user-1",
    "/perfil",
  ])("allows the mobile consultation path %s", (pathname) => {
    expect(isMobilePathAllowed(pathname)).toBe(true);
    expect(getMobileRouteRedirect(pathname, true)).toBeNull();
  });

  it.each(["/", "/modulos", "/alertas", "/estatisticas", "/auditoria", "/localidades"])(
    "redirects the mobile-only restricted path %s",
    (pathname) => {
      expect(getMobileRouteRedirect(pathname, true)).toBe("/inqueritos");
      expect(getMobileRouteRedirect(pathname, false)).toBeNull();
    },
  );
});
