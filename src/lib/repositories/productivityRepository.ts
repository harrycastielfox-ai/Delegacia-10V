import { supabase } from "@/lib/supabaseClient";
import { runSupabaseQuery } from "@/lib/repositories/supabaseQuery";

export type EscrivaoProductivityRow = {
  user_id: string;
  nome: string;
  avatar_path: string | null;
  pontos: number;
  cadastros: number;
  atualizacoes: number;
  relatorios_enviados: number;
  ultima_atividade: string | null;
};

export async function listEscrivaoProductivity(
  days = 30,
  _options: { forceRefresh?: boolean } = {},
): Promise<EscrivaoProductivityRow[]> {
  const safeDays = Math.max(1, Math.min(365, Math.trunc(days)));
  const data = await runSupabaseQuery<EscrivaoProductivityRow[]>(
    "produtividade dos escrivães",
    (signal) =>
      supabase.rpc("list_escrivao_productivity", { p_days: safeDays }).abortSignal(signal),
  );

  return (data ?? []).map((row) => ({
    ...row,
    pontos: Number(row.pontos ?? 0),
    cadastros: Number(row.cadastros ?? 0),
    atualizacoes: Number(row.atualizacoes ?? 0),
    relatorios_enviados: Number(row.relatorios_enviados ?? 0),
  }));
}
