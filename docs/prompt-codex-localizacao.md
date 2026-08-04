# Prompt para o Codex — Módulo Localização Operacional (camada visual)

> Copie tudo abaixo da linha e cole no Codex.

---

Você vai construir a **camada visual** do módulo "Localização Operacional" do SIPI, um sistema interno da Delegacia Territorial de Itabela (23ª COORPIN). O módulo apoia diligências externas: cadastro de pessoas e endereços, planejamento de rota, acompanhamento do deslocamento da viatura, confirmação de chegada ao local e registro fotográfico georreferenciado.

## Divisão de trabalho — leia antes de começar

Esta tarefa é **só de interface**. A camada de dados (Supabase, tabelas, RLS, storage, migrações) está sendo feita por outra pessoa em paralelo. Para não haver conflito:

**Você PODE criar e editar:**

- `src/routes/localizacao*.tsx`
- `src/features/localizacao/pages/**`
- `src/features/localizacao/components/**`
- `src/routes/modulos.tsx` (apenas as 2 linhas indicadas no item 12)

**Você NÃO pode tocar, em nenhuma hipótese:**

- `src/lib/repositories/localizacaoRepository.ts` — é o contrato; consuma como está
- `src/features/localizacao/localizacaoTypes.ts` e `localizacaoConstants.ts` — idem
- `src/styles.css` — os tokens já estão definidos
- `src/lib/mapLinks.ts` e `src/components/AbrirNoMapa.tsx` — prontos, apenas use
- `src/lib/mobileExperience.ts`, `supabase/**`, qualquer outro módulo (veículos, inquéritos, representações)

Se sentir falta de algum campo ou função no contrato, **não invente**: escreva o que faltou no final da sua resposta e siga com o que existe.

## Regras de estilo — obrigatórias

O erro mais caro que você pode cometer aqui é usar cor crua. O sistema tem **três temas** (`dark`, `light`, `black`) que o usuário troca em tempo real pelo `AppearanceSwitcher`. Cor fixa quebra dois deles.

1. **Nunca** use `#hex`, `rgb()`, `rgba()`, nem classes de paleta do Tailwind (`slate-800`, `cyan-400`, `emerald-500`, `amber-400`, `sky-300`...). **Sempre** os tokens do design system: `bg-background`, `bg-card`, `bg-popover`, `bg-sidebar`, `bg-muted`, `bg-accent`, `text-foreground`, `text-muted-foreground`, `border-border`, `border-sidebar-border`.
2. A cor de identidade deste módulo é o token **`operational`** (ciano): `text-operational`, `bg-operational/10`, `border-operational/40`. Ele já existe nos três temas.
3. Status usam tokens semânticos: `success` (no local), `warning` (planejada/pendente), `info` (concluída), `destructive` (cancelada/erro). O mapa de status → token já está em `DILIGENCIA_STATUS_TONE` (`localizacaoConstants.ts`) — use de lá, não recrie.
4. Sombras e brilhos coloridos: use `color-mix`, ex.: `shadow-[0_0_24px_color-mix(in_oklab,var(--operational)_14%,transparent)]`. Nunca `rgba()` fixo.
5. Superfície do mapa: `bg-[var(--operational-map)]` (clareia sozinha no tema claro).
6. **Contraste**: texto secundário no mínimo `text-muted-foreground`. Nada de texto de 9px em cinza escuro sobre fundo escuro — precisa passar em 4,5:1.
7. **Responsivo de verdade**: sem rolagem horizontal na página em 390px de largura. Tabelas largas rolam dentro do próprio contêiner (`overflow-x-auto`), nunca a página.
8. Ícones: `lucide-react`. Fonte, raio e espaçamento: siga o que já existe.

## Referências que você deve imitar

- **Visual**: a tela `/mockups/localizacao-operacional` (arquivo `src/routes/mockups.localizacao-operacional.tsx`) já está no padrão certo e com os tokens aplicados. É a sua referência estética — mantenha essa linguagem.
- **Estrutura de módulo**: copie a organização do módulo de veículos — `src/routes/veiculos.tsx` (rota fina que faz lazy-load), `src/features/vehicles/pages/VehiclesModuleFrame.tsx` (moldura com sidebar), `VehicleOverviewPage.tsx` (visão geral), `src/components/VehiclesSidebar.tsx` (navegação).
- **Componentes existentes**: reaproveite `StatCard`, `Panel`, `PageHeader`, `AppearanceSwitcher`. Não recrie o que já existe.

## O que construir

### 1. Moldura do módulo

`src/routes/localizacao.tsx` — rota fina com `lazy` + `Suspense`, espelhando `veiculos.tsx`.
`src/features/localizacao/pages/LocalizacaoModuleFrame.tsx` — layout com sidebar fixa + `<Outlet />`, verificação de sessão/perfil igual à do módulo de veículos.
`src/features/localizacao/components/LocalizacaoSidebar.tsx` — navegação, acento `operational`:

- **OPERAÇÃO**: Visão Geral, Diligências, Mapa operacional, Chegadas ao local, Relatórios de campo
- **CADASTROS**: Pessoas / Alvos, Endereços, Rotas salvas, Registros fotográficos

Rodapé com perfil do usuário e "Sair do módulo" apontando para `/modulos`.
`LocalizacaoMobileNavigation.tsx` — navegação inferior para telas pequenas.
`LocalizacaoRouteFallback.tsx` — esqueleto de carregamento.

### 2. Visão Geral — `/localizacao`

Consome `getLocalizacaoOverviewStats()`. Cards de indicador clicáveis que filtram a tabela: Diligências ativas, Em deslocamento, No local, Concluídas hoje. Abaixo: painel do mapa + painel lateral "Operação em andamento" + tabela "Próximas diligências". É a tela do mockup — mantenha a composição.

### 3. Diligências — `/localizacao/diligencias`

Tabela completa via `listDiligenciasPage(filters)`, com busca por texto, filtro de status e de tipo, e paginação. Clique na linha abre o detalhe. Estado vazio com ação de limpar filtros.

### 4. Detalhe — `/localizacao/diligencias/$diligenciaId`

Consome `getDiligenciaById(id)`. Mostra dados da diligência, endereço, pessoa vinculada, equipe, horários, trilha de progresso e as fotos. Inclua o componente `<AbrirNoMapa />` já pronto:

```tsx
import { AbrirNoMapa } from "@/components/AbrirNoMapa";

<AbrirNoMapa
  target={{
    endereco: diligencia.endereco ? `${diligencia.endereco.logradouro}, ${diligencia.endereco.numero ?? "s/n"}` : null,
    latitude: diligencia.endereco?.latitude,
    longitude: diligencia.endereco?.longitude,
  }}
/>;
```

### 5. Nova / editar diligência

`/localizacao/diligencias/nova` e `.../editar`. Formulário com tipo, endereço (seletor com busca), pessoa (seletor com busca), equipe, viatura, agendamento e observações. Usa `createDiligencia` / `updateDiligencia`. Validação: tipo e endereço obrigatórios.

### 6. Mapa operacional — `/localizacao/mapa`

Mapa em tela cheia com o painel lateral. **Importante**: por enquanto mantenha o mapa estilizado do mockup, sem biblioteca de mapa. A integração com Leaflet/MapLibre é da outra frente. Só deixe o componente `MapaCanvas` isolado, recebendo as diligências por prop, para a troca ser simples depois.

### 7. Chegadas ao local — `/localizacao/chegadas`

Lista das chegadas registradas com horário, coordenada, precisão e quem registrou. Botão "Registrar chegada" que chama `registrarChegada(...)` — a captura de GPS será ligada depois; deixe a chamada preparada recebendo lat/lng/precisão.

### 8. Tela do agente em campo (celular) — a mais importante

`src/features/localizacao/pages/DiligenciaCampoPage.tsx`. Pensada para uso a 390px, no sol, com uma mão. Mostra: destino em destaque, botão grande "Navegar até o local" (usa `<AbrirNoMapa />`), botão grande "Cheguei ao local", área de anexar fotos e campo de observação. Poucos elementos, alvos de toque grandes, texto legível.

### 9. Cadastros

`/localizacao/pessoas` (`listPessoas`, `createPessoa`), `/localizacao/enderecos` (`listEnderecos`, `createEndereco`), `/localizacao/rotas` (`listRotasSalvas`), `/localizacao/registros` (grade de fotos). Listagem + busca + formulário de cadastro em cada.

### 10. Relatórios de campo — `/localizacao/relatorios`

Tela de consolidação com filtros por período e equipe. Pode ficar simples nesta rodada.

### 11. Componentes compartilhados

`DiligenciaStatusBadge`, `DiligenciaProgressTrail` (a trilha Planejada → Em deslocamento → No local → Concluída, usando `DILIGENCIA_PROGRESSO`), `OperacaoPanel`, `DiligenciasTable`, `EnderecoPicker`, `PessoaPicker`.

### 12. Habilitar o módulo

Em `src/routes/modulos.tsx`, no item `localizacao-operacional`: trocar `disponivel: false` por `true` e acrescentar `to: "/localizacao"`. Só isso nesse arquivo.

## Definição de pronto

Antes de terminar, rode e deixe verde:

```bash
pnpm run lint
pnpm exec tsc --noEmit
pnpm run test
```

O projeto tem 7 erros de tipo pré-existentes em veículos/inquéritos/representações — **não são seus e não são para você corrigir**. Apenas garanta que não surgiu nenhum novo.

Confira também, antes de entregar:

- Trocar entre os três temas não quebra nenhuma tela.
- Nenhuma página rola na horizontal a 390px.
- `grep -rE "#[0-9a-fA-F]{6}|rgba?\(|(slate|cyan|emerald|amber|sky)-[0-9]{2,3}" src/features/localizacao src/routes/localizacao*` não retorna nada.

No final da resposta, liste: (a) os arquivos criados, (b) qualquer campo ou função que você precisou e não existia no contrato, (c) o que ficou faltando.
