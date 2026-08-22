# Research: Manutenção do Roster com Versionamento

**Feature**: 006-manutencao-roster | **Date**: 2026-08-02

---

## 1. Estrutura de Versionamento no Firestore

**Decision**: Cada versão do roster é um documento imutável na subcoleção `turmas/{turmaId}/roster-versions/{versionId}`, com snapshot completo da lista de jogadores.

**Rationale**: 
- Subcoleções no Firestore são naturalmente paginadas e ordenadas
- Documentos imutáveis garantem integridade (nunca se edita uma versão existente)
- Snapshot completo (vs. delta/diff) simplifica leitura — não precisa reconstruir estado a partir de deltas
- `currentRosterVersion` no documento pai (`turmas/{turmaId}`) aponta para a versão ativa, permitindo leitura em O(1)

**Alternatives considered**:
- Delta-based versioning (armazenar apenas diffs): descartado por complexidade de reconstrução e risco de corrupção em cadeia
- Single document com array de versões: descartado por limite de 1MB por documento no Firestore
- Campo `version` incremental: descartado em favor de auto-generated IDs do Firestore (evita race conditions no incremento)

---

## 2. Identificador Estável de Jogador (Stable Player ID)

**Decision**: Cada jogador recebe um ID estável no formato UUID curto (nanoid de 8 chars) gerado na criação, persistido em todas as versões.

**Rationale**:
- Permite calcular diffs corretos no histórico (distinguir "renomear" de "remover + adicionar")
- IDs numéricos sequenciais (já existentes no modelo atual) podem ser reaproveitados para o seeding, mas novos jogadores usam nanoid para evitar colisão cross-turma
- Formato curto (8 chars) é suficiente para o volume esperado (~50 jogadores por turma)

**Alternatives considered**:
- Auto-increment global: descartado por complexidade em ambiente sem backend centralizado
- Nome como chave: descartado pois jogadores podem ser renomeados
- Firestore document ID: descartado pois jogadores não são documentos individuais (estão em array)

---

## 3. Angular CDK Drag & Drop para Reordenação

**Decision**: Usar `@angular/cdk/drag-drop` (CdkDragDrop) para implementar reordenação na lista de jogadores.

**Rationale**:
- Já faz parte do ecossistema Angular Material (zero dependências extras)
- Suporte nativo a touch (mobile) e mouse (desktop)
- Integração direta com arrays — `moveItemInArray()` reordena in-place
- Feedback visual built-in (placeholder, preview, animações)

**Alternatives considered**:
- SortableJS / ngx-sortablejs: dependência externa desnecessária
- Implementação manual com pointer events: muito trabalho para resultado inferior
- Apenas setas (sem drag & drop): usabilidade inferior para reordenações grandes

---

## 4. Painel Expansível na Tela de Criação

**Decision**: Usar `<mat-expansion-panel>` do Angular Material para o modo de edição do roster dentro da tela de criação de jogo.

**Rationale**:
- Componente nativo do Material que já suporta expand/collapse com animação
- Permite manter o formulário de criação visível (mas desabilitado) enquanto o painel está aberto
- Acessibilidade built-in (ARIA, keyboard navigation)
- Consistência visual com o resto do app (se usar Material)

**Alternatives considered**:
- Modal/dialog: descartado explicitamente na spec (UX: painel na mesma tela)
- Rota separada: descartado pois quebraria o fluxo unificado
- Custom collapsible: trabalho extra sem ganho

---

## 5. Captura Automática de Device Info no Salvamento

**Decision**: Reutilizar o `DeviceInfoService` existente (`src/app/features/players/device-info.service.ts`) para capturar user-agent, screen resolution, language e device model no momento do salvamento.

**Rationale**:
- Serviço já implementado e testado no projeto (usado nos logs de checkin)
- Captura IP via api.ipify.org (com cache), user-agent, screen resolution, language, e device model via User-Agent Client Hints
- Sem necessidade de campo manual — transparente para o usuário

**Alternatives considered**:
- Novo serviço dedicado: desnecessário (DRY)
- Captura apenas de user-agent: insuficiente para identificação de dispositivo
- Captura no cliente com envio para Cloud Function: over-engineering para este caso

---

## 6. Seeding Automático (Migração de Dados Hardcoded)

**Decision**: Na primeira leitura do roster (quando `turmas/{turmaId}/roster-versions/` está vazia), criar automaticamente a versão 1 a partir dos arrays `DEFAULT_PLAYERS` e `DOMINGOU_PLAYERS` em `game.model.ts`.

**Rationale**:
- Dados hardcoded já existem em `src/app/models/game.model.ts` — 23 jogadores (Sextou) e 24 jogadores (Domingou)
- IDs numéricos existentes (1-21, 1-24) serão convertidos para strings estáveis ("1", "2", ...) no seeding
- Seeding ocorre client-side (no service) para manter arquitetura serverless
- Flag `deviceInfo: { source: "Sistema" }` identifica versão de migração

**Alternatives considered**:
- Script de migração manual: descartado (spec exige transparência, sem intervenção)
- Cloud Function triggered: over-engineering para operação one-time
- Manter dados hardcoded indefinidamente: incompatível com edição dinâmica

---

## 7. Estratégia de Paginação do Histórico

**Decision**: Query Firestore com `orderBy('createdAt', 'desc')`, `limit(20)`, e paginação via `startAfter()` (cursor-based) para o botão "Carregar mais".

**Rationale**:
- Paginação por cursor é a abordagem recomendada no Firestore (vs. offset)
- Limite de 20 por página balanceia UX e custo de reads
- `orderBy` + `limit` aproveitam índices nativos do Firestore

**Alternatives considered**:
- Carregar tudo e paginar no cliente: funciona para poucas versões, mas não escala
- Offset-based: não suportado eficientemente no Firestore
- Infinite scroll: descartado em favor de botão explícito (spec define "Carregar mais")

---

## 8. Cálculo de Diff Visual entre Versões

**Decision**: Implementar utility function `calculateRosterDiff(previous, current)` que compara versões por ID estável de jogador para produzir: adicionados, removidos, movidos (com posição anterior/nova), renomeados.

**Rationale**:
- IDs estáveis permitem tracking preciso (não depende de nome para identificar jogador)
- Diff calculado on-the-fly ao expandir entrada do histórico (não persistido)
- Categorias: `added` (ID novo), `removed` (ID ausente), `moved` (mesmo ID, posição diferente), `renamed` (mesmo ID, nome diferente)

**Alternatives considered**:
- Persistir diff junto com a versão: redundância desnecessária (snapshot completo permite recalcular)
- Diff baseado em nome: quebra com renomeações
- Biblioteca externa de diff (json-diff, etc.): over-engineering para array simples

---

## 9. Vinculação Roster → Game e Blocking

**Decision**: Adicionar campo `rosterVersionId: string` ao modelo `Game`. Na criação, copiar `turmas/{turmaId}.currentRosterVersion`. Se roster não carregou (Firestore indisponível), bloquear formulário.

**Rationale**:
- Vinculação imutável garante que jogos existentes não são afetados por edições futuras
- Blocking na indisponibilidade previne estado inconsistente (jogo sem roster válido)
- Campo simples (string ID) — leitura do roster do jogo é feita sob demanda pela spec 003

**Alternatives considered**:
- Copiar todo o snapshot para dentro do game: redundância massiva
- Referência ao "latest" sempre: violaria imutabilidade exigida
- Permitir criação sem roster e vincular depois: risco de inconsistência

---

## 10. Validação de Mínimo de Jogadores Ativos

**Decision**: Validação síncrona no componente: `activePlayersCount >= totalPlayers` como condição para habilitar botão "Criar Jogo". Mensagem de erro dinâmica com contagens.

**Rationale**:
- Validação no cliente é suficiente (não há API server-side)
- Signal computado `canCreateGame` reage automaticamente a mudanças no roster
- Mensagem segue formato definido na spec: "A lista precisa ter pelo menos {N} jogadores ativos..."

**Alternatives considered**:
- Validação server-side (Firestore Security Rules): complementar mas não substitui UX
- Validação apenas no submit: UX inferior (feedback tardio)
