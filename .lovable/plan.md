## Objetivo

Adicionar **somente UI** (sem backend, sem banco) de:

1. Tela de **login institucional** em `/login` com credencial fixa client-side: `Admin` / `admin123`.
2. Painel de **módulos** em `/modulos` com 3 cards: **INQUÉRITOS**, **VEÍCULOS APREENDIDOS**, **OBJETOS APREENDIDOS**.

A estrutura atual do dashboard (`/`, sidebar, panels SIPI etc.) **não será alterada**. Apenas adiciono novas rotas isoladas.

---

## Arquivos a criar / alterar

**Criar:**

- `src/routes/login.tsx` — tela de login full-screen, fora do AppLayout/sidebar.
- `src/routes/modulos.tsx` — painel com os 3 cards de módulos.
- `src/lib/auth.ts` — helper minúsculo de "sessão" via `sessionStorage` (`isLoggedIn()`, `login()`, `logout()`). Sem backend, só para o fluxo visual funcionar.

**Alterar (mínimo):**

- `src/components/AppSidebar.tsx` — adicionar item "Módulos" apontando para `/modulos` e botão de logout funcional (limpa sessionStorage e vai para `/login`). Não removo nada existente.

Não toco em: `routeTree.gen.ts` (auto-gerado pelo plugin), `__root.tsx`, dashboard `/`, dados SIPI, demais rotas.

---

## Tela de Login (`/login`)

Layout institucional, full-screen, fundo escuro (mesma paleta `--background` / OKLCH já existente), sem sidebar.

```text
┌──────────────────────────────────────────────┐
│                                              │
│         ┌───────────────────────┐            │
│         │   [escudo]  SIPI      │            │
│         │   Inquéritos Policiais│            │
│         │                       │            │
│         │   ACESSO RESTRITO     │            │
│         │                       │            │
│         │   Usuário             │            │
│         │   [_______________]   │            │
│         │   Senha               │            │
│         │   [_______________] 👁│            │
│         │                       │            │
│         │   [   ENTRAR      ]   │            │
│         │                       │            │
│         │   v2.0.0 · SIPI ©2026 │            │
│         └───────────────────────┘            │
│                                              │
└──────────────────────────────────────────────┘
```

Detalhes visuais:

- Card central `max-w-md`, borda `border-primary/30`, sombra suave, cabeçalho com ícone `Shield` (lucide) em badge verde tático (igual à sidebar atual).
- Inputs estilo shadcn (`@/components/ui/input` e `Label`), com ícones `User` e `Lock`.
- Botão "ENTRAR" full-width, `bg-primary`, uppercase tracking-wide.
- Mensagem de erro discreta em `text-destructive` quando credenciais inválidas.
- Faixa de "ACESSO RESTRITO — uso exclusivo da Polícia Civil" em destaque, estilo institucional.
- Responsivo: padding lateral em mobile, card centralizado em todas as larguras.

Comportamento (apenas frontend):

- Submit valida `usuario === "Admin" && senha === "admin123"`.
- Se OK: `sessionStorage.setItem("sipi_auth", "1")` e `navigate({ to: "/modulos" })`.
- Se errado: mostra "Usuário ou senha inválidos."
- Se já logado ao abrir `/login`: redireciona para `/modulos`.

---

## Painel de Módulos (`/modulos`)

Usa o `AppLayout` existente (sidebar + main) para manter identidade visual.

```text
┌────────────┬─────────────────────────────────────────────┐
│  SIDEBAR   │  PageHeader: "Módulos do Sistema"           │
│            │  subtitle: "Selecione um módulo p/ acessar" │
│            │                                             │
│            │  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│            │  │  📄 IP   │ │  🚗 VEÍC │ │ 📦 OBJ   │    │
│            │  │INQUÉRITOS│ │APREENDIDOS│ │APREENDIDOS│   │
│            │  │  cinza   │ │   azul   │ │  âmbar   │    │
│            │  │  hint    │ │   hint   │ │   hint   │    │
│            │  │ Acessar →│ │Acessar → │ │ Acessar →│    │
│            │  └──────────┘ └──────────┘ └──────────┘    │
└────────────┴─────────────────────────────────────────────┘
```

Cada card:

- Container: `bg-card border border-border rounded-xl p-6`, hover eleva borda para `border-primary/40` e leve `translate-y`.
- Topo: ícone grande dentro de badge colorido (tom diferente por módulo: `success`, `info`, `warning`).
- Título uppercase tracking-wide.
- Linha de "hint" curta (ex.: "Procedimentos investigativos").
- Rodapé: link "Acessar →" (apenas visual; Inquéritos navega para `/inqueritos` que já existe; Veículos/Objetos navegam para `#` com toast "Em desenvolvimento" — mantém UI honesta sem criar rotas falsas).
- Grid: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5`.

Ícones (lucide): `FileText` (Inquéritos), `Car` (Veículos), `Package` (Objetos).

---

## Detalhes técnicos

- **Roteamento**: arquivos `src/routes/login.tsx` e `src/routes/modulos.tsx` com `createFileRoute("/login")` e `createFileRoute("/modulos")`. O plugin Vite regenera `routeTree.gen.ts` automaticamente.
- **Sem guards de rota**: por escolha do usuário (somente visual). A "proteção" é client-side simples no `/modulos` — se `sessionStorage.sipi_auth !== "1"`, faz `navigate({ to: "/login" })` num `useEffect`. Isto NÃO é segurança real, é só fluxo visual, conforme combinado.
- **Credencial hardcoded**: `Admin` / `admin123` direto no componente de login. Documentado em comentário que será substituído por backend PHP.
- **Sem novas dependências**: usa shadcn (`Input`, `Label`, `Button`) e lucide-react já instalados.
- **Sidebar**: adicionar entrada `{ title: "Módulos", url: "/modulos", icon: LayoutGrid }` e tornar o botão de logout funcional.

---

## Checklist de entrega

- [ ] `/login` renderiza tela cheia, sem sidebar, responsiva.
- [ ] Login com `Admin` / `admin123` redireciona para `/modulos`.
- [ ] Login errado mostra mensagem de erro.
- [ ] `/modulos` mostra 3 cards estilizados dentro do AppLayout.
- [ ] Card "Inquéritos" leva para `/inqueritos`; demais mostram aviso "Em breve".
- [ ] Sidebar ganha item "Módulos" e logout funcional.
- [ ] Nada do dashboard atual (`/`, panels SIPI, dados) é alterado.
