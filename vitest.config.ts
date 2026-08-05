import { defineConfig } from "vitest/config";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsConfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // O CI não tem (nem deve ter) as credenciais reais do Supabase — só o
    // .env.local de cada máquina tem. Sem isso, qualquer teste que importe,
    // ainda que indiretamente, um repositório que cria o client do Supabase
    // no escopo do módulo quebra em runtime só por faltar a variável, mesmo
    // que o teste em si não faça nenhuma chamada de rede real.
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY:
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "placeholder-key-for-tests",
    },
  },
});
