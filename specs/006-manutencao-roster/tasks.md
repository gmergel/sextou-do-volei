# Tasks: Manutenção da Lista de Jogadores com Versionamento

**Input**: Design documents from `/specs/006-manutencao-roster/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Angular SPA**: `src/app/` at repository root
- Models: `src/app/models/`
- Features: `src/app/features/roster/`
- Existing services: `src/app/features/players/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Instalar dependências e criar estrutura base do feature module

- [X] T001 Instalar `@angular/cdk` como dependência do projeto (`npm.cmd install @angular/cdk`)
- [X] T002 [P] Criar diretório da feature `src/app/features/roster/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Modelos, interfaces e serviço base que TODAS as user stories dependem

**⚠️ CRITICAL**: Nenhuma user story pode iniciar antes desta fase estar completa

- [X] T003 Criar interfaces `RosterPlayer`, `RosterDeviceInfo`, `RosterVersion`, `RosterHistoryPage` em `src/app/models/roster.model.ts`
- [X] T004 Adicionar campo `currentRosterVersion?: string` à interface/modelo de turma em `src/app/models/turma.model.ts`
- [X] T005 Adicionar campo `rosterVersionId?: string` à interface `Game` em `src/app/models/game.model.ts`
- [X] T006 Implementar `RosterService` com métodos `getCurrentRoster()`, `saveRosterVersion()`, `getRosterHistory()`, `seedRoster()` em `src/app/features/roster/roster.service.ts` (conforme contrato em `contracts/roster-service.contract.md`)
- [X] T007 Implementar utility `calculateRosterDiff(previous, current)` em `src/app/features/roster/roster-diff.util.ts`

**Checkpoint**: Foundation ready — implementação de user stories pode iniciar

---

## Phase 3: User Story 8 — Seeding Automático na Primeira Execução (Priority: P1) 🎯 MVP

**Goal**: Na primeira leitura do roster, criar automaticamente a versão 1 a partir dos dados hardcoded (`DEFAULT_PLAYERS` e `DOMINGOU_PLAYERS`)

**Independent Test**: Acessar tela de criação de jogo com turma sem versões no Firestore e verificar que versão 1 é criada com `deviceInfo.source: "Sistema"`

### Implementation

- [X] T008 [US8] Implementar lógica de seeding em `RosterService.seedRoster()` — mapear `DEFAULT_PLAYERS`/`DOMINGOU_PLAYERS` para `RosterPlayer[]` (IDs numéricos como string, `active: true`, `initial` derivado) em `src/app/features/roster/roster.service.ts`
- [X] T009 [US8] Integrar seeding no fluxo `getCurrentRoster()` — detectar subcoleção vazia e triggar `seedRoster()` automaticamente em `src/app/features/roster/roster.service.ts`

**Checkpoint**: Ao selecionar uma turma sem roster, a versão 1 é criada automaticamente

---

## Phase 4: User Story 1 — Visualização do Roster na Criação de Jogo (Priority: P1) 🎯 MVP

**Goal**: Ao selecionar uma turma na tela de criação de jogo, exibir preview compacto com lista de nomes ordenada por prioridade e resumo (N ativos + data da versão)

**Independent Test**: Selecionar turma na tela de novo jogo e verificar que lista aparece ordenada com resumo "N jogadores ativos | Versão de DD/MM/AAAA"

### Implementation

- [X] T010 [P] [US1] Criar `RosterPreviewComponent` (standalone, signals) com inputs `turmaId` e exibição de resumo + lista de nomes em `src/app/features/roster/roster-preview.component.ts`
- [X] T011 [P] [US1] Criar template HTML do preview (resumo "N jogadores ativos | Versão de DD/MM/AAAA" + lista ordenada) em `src/app/features/roster/roster-preview.component.html`
- [X] T012 [US1] Integrar `RosterPreviewComponent` na tela de criação de jogo — exibir após seleção de turma em `src/app/features/create-game/create-game.component.html`
- [X] T013 [US1] Conectar `CreateGameComponent` ao `RosterService.getCurrentRoster()` para carregar roster ao selecionar turma em `src/app/features/create-game/create-game.component.ts`

**Checkpoint**: Preview do roster visível na tela de criação de jogo após seleção de turma

---

## Phase 5: User Story 2 — Edição Inline do Roster com Reordenação (Priority: P1)

**Goal**: Painel expansível na tela de criação de jogo com drag & drop e setas para reordenar jogadores

**Independent Test**: Abrir modo de edição, arrastar jogador para nova posição, verificar que ordem visual reflete a mudança

### Implementation

- [X] T014 [P] [US2] Criar `RosterEditorComponent` (standalone, signals) com CDK DragDrop para reordenação e setas up/down em `src/app/features/roster/roster-editor.component.ts`
- [X] T015 [P] [US2] Criar template HTML do editor com `cdkDropList`, itens arrastáveis, botões de seta (up/down) em `src/app/features/roster/roster-editor.component.html`
- [X] T016 [P] [US2] Criar estilos do editor (drag placeholder, estado desabilitado do form, mobile-friendly) em `src/app/features/roster/roster-editor.component.scss`
- [X] T017 [US2] Integrar `RosterEditorComponent` como `<mat-expansion-panel>` na tela de criação de jogo com botão "Editar lista" em `src/app/features/create-game/create-game.component.html`
- [X] T018 [US2] Implementar lógica de desabilitar formulário de criação enquanto painel de edição está aberto em `src/app/features/create-game/create-game.component.ts`
- [X] T019 [US2] Implementar guard de alterações não salvas (confirmação ao fechar/navegar com changes pendentes) em `src/app/features/roster/roster-editor.component.ts`

**Checkpoint**: Reordenação funcional por drag & drop e setas, formulário desabilitado durante edição

---

## Phase 6: User Story 3 — Adição e Remoção de Jogadores (Priority: P1)

**Goal**: Adicionar novos jogadores ao final da lista, remover (soft delete) e reativar jogadores

**Independent Test**: Adicionar jogador com nome válido → aparece no final; desativar jogador → aparece em seção "Inativos"

### Implementation

- [X] T020 [US3] Adicionar campo de input para novo jogador com validação (≥ 2 chars, duplicata case-insensitive) no `RosterEditorComponent` em `src/app/features/roster/roster-editor.component.ts`
- [X] T021 [US3] Implementar lógica de soft-delete (marcar `active: false`) e seção de inativos com botão "Reativar" em `src/app/features/roster/roster-editor.component.ts`
- [X] T022 [US3] Implementar edição inline de nome de jogador (com revalidação de unicidade) em `src/app/features/roster/roster-editor.component.ts`
- [X] T023 [US3] Atualizar template HTML com: input de adição, botões de remover/reativar, seção "Inativos", edição de nome em `src/app/features/roster/roster-editor.component.html`

**Checkpoint**: Adicionar, remover (soft delete), reativar e renomear jogadores funcionais

---

## Phase 7: User Story 4 — Salvamento com Criação de Nova Versão (Priority: P1)

**Goal**: Salvar alterações cria versão imutável no Firestore com device info automático e atualiza `currentRosterVersion`

**Independent Test**: Fazer alterações, clicar salvar, verificar novo documento em `turmas/{turmaId}/roster-versions/` com snapshot + device info

### Implementation

- [X] T024 [US4] Implementar método `collectDeviceInfo(): Promise<RosterDeviceInfo>` reutilizando `DeviceInfoService` existente em `src/app/features/roster/roster.service.ts`
- [X] T025 [US4] Implementar botão "Salvar alterações" no editor — chamar `RosterService.saveRosterVersion()` com players editados e device info capturado em `src/app/features/roster/roster-editor.component.ts`
- [X] T026 [US4] Implementar feedback visual de salvamento (loading state via signal `isSaving`) e atualização do preview após save em `src/app/features/roster/roster-editor.component.ts`
- [X] T027 [US4] Implementar tratamento de erro no salvamento (exibir mensagem se Firestore indisponível) em `src/app/features/roster/roster-editor.component.ts`

**Checkpoint**: Salvar cria nova versão imutável, preview atualiza, device info capturado automaticamente

---

## Phase 8: User Story 7 — Vinculação de Versão ao Jogo Criado (Priority: P1)

**Goal**: Ao criar jogo, vincular `rosterVersionId` permanentemente ao documento do game

**Independent Test**: Criar jogo, alterar roster depois, verificar que jogo continua usando versão original

### Implementation

- [X] T028 [US7] Alterar `GameService.createGame()` para receber e persistir `rosterVersionId` no documento do jogo em `src/app/features/players/game.service.ts`
- [X] T029 [US7] Atualizar `CreateGameComponent` para passar `currentRosterVersion.id` ao criar jogo em `src/app/features/create-game/create-game.component.ts`
- [X] T030 [US7] Implementar bloqueio de criação de jogo quando roster não carregou (Firestore indisponível) — exibir erro e desabilitar botão em `src/app/features/create-game/create-game.component.ts`

**Checkpoint**: Jogos criados com `rosterVersionId` fixo; criação bloqueada se roster indisponível

---

## Phase 9: User Story 9 — Validação de Mínimo de Jogadores Ativos (Priority: P2)

**Goal**: Impedir criação de jogo quando jogadores ativos < `totalPlayers`

**Independent Test**: Desativar jogadores até < totalPlayers, tentar criar jogo → bloqueado com mensagem clara

### Implementation

- [ ] T031 [US9] Implementar signal computado `canCreateGame` (activeCount >= totalPlayers) e mensagem de erro dinâmica em `src/app/features/create-game/create-game.component.ts`
- [ ] T032 [US9] Exibir aviso visual no editor quando ativos < totalPlayers (warning, não bloqueante para edição) em `src/app/features/roster/roster-editor.component.ts`
- [ ] T033 [US9] Desabilitar botão "Criar Jogo" e exibir mensagem "A lista precisa ter pelo menos {N} jogadores ativos..." quando validação falha em `src/app/features/create-game/create-game.component.html`

**Checkpoint**: Criação de jogo bloqueada com mensagem clara quando ativos insuficientes

---

## Phase 10: User Story 6 — Identificação do Editor via Device Telemetry (Priority: P2)

**Goal**: Capturar automaticamente device info no salvamento para rastreabilidade

**Independent Test**: Salvar versão e verificar campo `deviceInfo` persistido com user-agent e dados do dispositivo

### Implementation

- [ ] T034 [US6] Garantir que `collectDeviceInfo()` captura user-agent, screen resolution, language, device model e IP (via DeviceInfoService existente) em `src/app/features/roster/roster.service.ts`

**Nota**: A maior parte desta US já foi implementada em T024 (Phase 7). T034 é validação/refinamento de que todos os campos são capturados corretamente.

**Checkpoint**: Device info completo persistido em cada versão salva

---

## Phase 11: User Story 5 — Histórico de Versões do Roster (Priority: P2)

**Goal**: Consultar histórico de versões com data, device info e diff visual (adições em verde, remoções em vermelho, movimentos)

**Independent Test**: Clicar "Ver histórico" e verificar lista de versões em ordem cronológica reversa com diffs visuais

### Implementation

- [ ] T035 [P] [US5] Criar `RosterHistoryComponent` (standalone, signals) com listagem paginada de versões em `src/app/features/roster/roster-history.component.ts`
- [ ] T036 [P] [US5] Criar template HTML do histórico com lista de versões (data, device info), diff visual (verde/vermelho/movido) e botão "Carregar mais" em `src/app/features/roster/roster-history.component.html`
- [ ] T037 [P] [US5] Criar estilos do histórico (diff colors, layout responsivo) em `src/app/features/roster/roster-history.component.scss`
- [ ] T038 [US5] Integrar `RosterHistoryComponent` no painel de edição com botão "Ver histórico" em `src/app/features/roster/roster-editor.component.html`
- [ ] T039 [US5] Implementar paginação com `getRosterHistory()` (20 por página, cursor-based com "Carregar mais") em `src/app/features/roster/roster-history.component.ts`
- [ ] T040 [US5] Integrar `calculateRosterDiff()` para exibir diff ao expandir cada versão no histórico em `src/app/features/roster/roster-history.component.ts`

**Checkpoint**: Histórico funcional com paginação, diffs visuais e device info por versão

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Ajustes finais que afetam múltiplas user stories

- [ ] T041 [P] Adicionar rota do roster (se necessário) em `src/app/app.routes.ts`
- [ ] T042 [P] Configurar Firestore index para `turmas/{turmaId}/roster-versions` (orderBy `createdAt` DESC) em `firestore.indexes.json`
- [ ] T043 Atualizar Firestore Security Rules para permitir leitura/escrita na subcoleção `roster-versions` em `firestore.rules`
- [ ] T044 [P] Cleanup: remover referências hardcoded de players na lógica de criação de jogo (usar roster dinâmico) em `src/app/features/create-game/create-game.component.ts`
- [ ] T045 Executar cenários do quickstart.md para validação end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — iniciar imediatamente
- **Foundational (Phase 2)**: Depende de Setup — BLOQUEIA todas as user stories
- **US8 - Seeding (Phase 3)**: Depende de Foundational — base para US1
- **US1 - Preview (Phase 4)**: Depende de US8 (precisa do roster carregado)
- **US2 - Edição (Phase 5)**: Depende de US1 (precisa do preview)
- **US3 - Add/Remove (Phase 6)**: Depende de US2 (dentro do editor)
- **US4 - Salvamento (Phase 7)**: Depende de US3 (precisa das alterações para salvar)
- **US7 - Vinculação (Phase 8)**: Depende de US1 (precisa do currentRosterVersion)
- **US9 - Validação mínimo (Phase 9)**: Depende de US7 (relacionada à criação de jogo)
- **US6 - Device Telemetry (Phase 10)**: Depende de US4 (refinamento do salvamento)
- **US5 - Histórico (Phase 11)**: Depende de US4 (precisa de versões salvas para exibir)
- **Polish (Phase 12)**: Depende de todas as user stories desejadas estarem completas

### Cadeia Crítica (MVP)

```
Setup → Foundational → US8 (Seeding) → US1 (Preview) → US2 (Edição) → US3 (Add/Remove) → US4 (Salvamento) → US7 (Vinculação)
```

### Parallel Opportunities

- T001, T002: Setup em paralelo
- T003, T004, T005: Modelos em paralelo (mesma fase, arquivos diferentes)
- T010, T011: Preview component + template em paralelo
- T014, T015, T016: Editor component + template + estilos em paralelo
- T035, T036, T037: Histórico component + template + estilos em paralelo
- US9 pode rodar em paralelo com US6 e US5 (após US7)

---

## Implementation Strategy

### MVP First (Setup → US8 → US1 → US2 → US3 → US4 → US7)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (modelos + serviço)
3. Complete Phase 3: US8 — Seeding automático
4. Complete Phase 4: US1 — Preview na criação de jogo
5. Complete Phase 5: US2 — Edição com reordenação
6. Complete Phase 6: US3 — Adição e remoção
7. Complete Phase 7: US4 — Salvamento com versionamento
8. Complete Phase 8: US7 — Vinculação ao jogo
9. **STOP and VALIDATE**: Testar fluxo completo (criar jogo com roster editável e versionado)

### Incremental Delivery

1. Setup + Foundational + US8 + US1 → Preview funcional (roster carregando)
2. + US2 + US3 → Edição completa (drag & drop, add/remove)
3. + US4 → Salvamento com versionamento (MVP funcional!)
4. + US7 → Vinculação ao jogo (MVP completo)
5. + US9 → Validação de mínimo (proteção)
6. + US6 + US5 → Histórico e telemetry (transparência)
7. Polish → Security rules, indexes, cleanup

---

## Notes

- [P] tasks = arquivos diferentes, sem dependências
- [Story] label mapeia task à user story para rastreabilidade
- Cada user story deve ser testável independentemente após conclusão
- Commit após cada task ou grupo lógico
- `DeviceInfoService` existente em `src/app/features/players/device-info.service.ts` será reutilizado (não duplicar)
- Dados de seeding vêm de `DEFAULT_PLAYERS` e `DOMINGOU_PLAYERS` em `src/app/models/game.model.ts`
