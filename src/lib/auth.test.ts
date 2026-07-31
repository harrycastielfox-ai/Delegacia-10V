import { FunctionsHttpError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  setSession: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    functions: { invoke: mocks.invoke },
    auth: { setSession: mocks.setSession },
  },
}));

import { authenticateWithLoginOrEmail } from "@/lib/auth";

function functionError(code: string, status: number) {
  return new FunctionsHttpError(
    new Response(JSON.stringify({ code }), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("authenticateWithLoginOrEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("envia as credenciais somente para a função segura e instala a sessão retornada", async () => {
    mocks.invoke.mockResolvedValue({
      data: { access_token: "access-token", refresh_token: "refresh-token" },
      error: null,
    });
    const session = { user: { id: "user-id" } };
    mocks.setSession.mockResolvedValue({ data: { session }, error: null });

    await expect(authenticateWithLoginOrEmail("  Agente.Um  ", "senha-secreta")).resolves.toBe(
      session,
    );
    expect(mocks.invoke).toHaveBeenCalledWith("secure-login", {
      body: { identifier: "Agente.Um", password: "senha-secreta" },
    });
    expect(mocks.setSession).toHaveBeenCalledWith({
      access_token: "access-token",
      refresh_token: "refresh-token",
    });
  });

  it("não revela se o usuário existe quando as credenciais são inválidas", async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: functionError("invalid_credentials", 401),
    });

    await expect(authenticateWithLoginOrEmail("desconhecido", "senha")).rejects.toMatchObject({
      code: "AUTH_INVALID_CREDENTIALS",
    });
    expect(mocks.setSession).not.toHaveBeenCalled();
  });

  it("distingue bloqueio temporário sem expor dados da conta", async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: functionError("too_many_attempts", 429),
    });

    await expect(authenticateWithLoginOrEmail("agente", "senha")).rejects.toMatchObject({
      code: "AUTH_RATE_LIMITED",
    });
  });

  it("preserva o aviso de confirmação de e-mail", async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: functionError("email_not_confirmed", 403),
    });

    await expect(authenticateWithLoginOrEmail("agente", "senha")).rejects.toMatchObject({
      code: "AUTH_EMAIL_NOT_CONFIRMED",
    });
  });

  it("trata falhas inesperadas da função como indisponibilidade", async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: new Error("network failure") });

    await expect(authenticateWithLoginOrEmail("agente", "senha")).rejects.toMatchObject({
      code: "AUTH_SERVICE_UNAVAILABLE",
    });
  });
});
