# Feature Specification: Apontamento de Participação

**Feature Branch**: `002-apontamento-participacao`

**Created**: 2026-08-02

**Status**: Draft

**Input**: User description: "Jogadores interagem com um jogo criado para informar se vão ou não participar, com atualizações em tempo real e controle de vagas."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Confirmar Presença em Jogo (Priority: P1)

Um jogador acessa a página do jogo pelo link compartilhado (`/jogo/{gameId}`), visualiza a lista de jogadores com seus status atuais e confirma sua presença no jogo clicando no botão de confirmação.

**Why this priority**: Esta é a funcionalidade principal da feature — sem ela, o jogo não pode ser organizado. É o fluxo mais comum e crítico para todos os participantes.

**Independent Test**: Pode ser testado acessando a rota do jogo, verificando que a lista de jogadores é exibida e que ao clicar em "Confirmar", o status do jogador muda para "confirmed" e a mudança é refletida na interface.

**Acceptance Scenarios**:

1. **Given** um jogo criado com vagas disponíveis e um jogador elegível com status "pending", **When** o jogador clica em "Confirmar Presença", **Then** seu status muda para "confirmed", o contador de vagas é atualizado e um registro de auditoria é gravado.
2. **Given** um jogo criado com vagas disponíveis e um jogador com status "declined", **When** o jogador clica em "Confirmar Presença", **Then** seu status muda para "confirmed" e as vagas restantes são decrementadas.
3. **Given** um jogo criado e um jogador **não elegível**, **When** o jogador tenta confirmar presença, **Then** o sistema bloqueia a ação e exibe uma mensagem indicando que ele não está elegível.

---

### User Story 2 - Recusar Presença / Voltar para Pendente (Priority: P1)

Um jogador que não pode participar recusa sua presença, ou um jogador que já havia confirmado decide voltar para o status "pendente" (toggle de confirmação).

**Why this priority**: Tão crítica quanto confirmar — permite que jogadores liberem vagas para outros e mantenham o status do jogo atualizado.

**Independent Test**: Pode ser testado confirmando presença e então clicando novamente para voltar a "pending", ou clicando em "Recusar" para mudar para "declined". Em ambos os casos, a vaga é liberada.

**Acceptance Scenarios**:

1. **Given** um jogador com status "confirmed", **When** o jogador clica em "Confirmar" novamente (toggle), **Then** seu status volta para "pending" e uma vaga é liberada.
2. **Given** um jogador com qualquer status, **When** o jogador clica em "Recusar", **Then** seu status muda para "declined" independente de elegibilidade.
3. **Given** um jogo lotado e um jogador confirmado que volta para "pending", **When** a mudança é processada, **Then** o jogo reabre para novas confirmações (não está mais lotado).

---

### User Story 3 - Visualização em Tempo Real (Priority: P1)

Todos os jogadores que estão com a página do jogo aberta veem as atualizações de status dos outros jogadores em tempo real, sem precisar recarregar a página.

**Why this priority**: Essencial para a experiência do usuário — sem tempo real, os jogadores não teriam visibilidade do estado atual do jogo e poderiam tomar decisões com informações desatualizadas.

**Independent Test**: Pode ser testado abrindo a página do jogo em dois dispositivos/abas, confirmando presença em um e verificando que a mudança aparece instantaneamente no outro.

**Acceptance Scenarios**:

1. **Given** dois jogadores com a página do jogo aberta, **When** o Jogador A confirma presença, **Then** o Jogador B vê o status do Jogador A mudar para "confirmed" sem recarregar a página.
2. **Given** um jogador com a página aberta, **When** o jogo atinge lotação máxima por ação de outro jogador, **Then** o primeiro jogador vê o indicador de "jogo lotado" aparecer automaticamente.

---

### User Story 4 - Controle de Lotação do Jogo (Priority: P2)

Quando todas as vagas do jogo são preenchidas (confirmados == totalPlayers), o sistema bloqueia novas confirmações até que alguém libere uma vaga.

**Why this priority**: Garante que o jogo respeite o limite de jogadores, evitando overbooking e conflitos na organização.

**Independent Test**: Pode ser testado preenchendo todas as vagas e verificando que jogadores pendentes não conseguem confirmar, e que ao liberar uma vaga o botão é reativado.

**Acceptance Scenarios**:

1. **Given** um jogo com todas as vagas preenchidas (confirmados == totalPlayers), **When** um jogador pendente tenta confirmar presença, **Then** o sistema bloqueia a ação e exibe indicador de jogo lotado.
2. **Given** um jogo lotado, **When** um jogador confirmado muda para "pending" ou "declined", **Then** o jogo reabre e jogadores elegíveis podem confirmar novamente.
3. **Given** um jogo lotado, **When** um jogador visualiza a página, **Then** o contador mostra "0 vagas restantes" e os botões de confirmação estão desabilitados para quem não está confirmado.

---

### User Story 5 - Adicionar Jogador Convidado (Priority: P3)

O organizador do jogo pode adicionar jogadores convidados (guests) que não fazem parte do roster fixo da turma.

**Why this priority**: Funcionalidade secundária que expande a flexibilidade do sistema, mas não é essencial para o fluxo principal de confirmação.

**Independent Test**: Pode ser testado pelo organizador adicionando um convidado e verificando que ele aparece na lista com flag de guest e ID sequencial correto.

**Acceptance Scenarios**:

1. **Given** um organizador na página do jogo, **When** ele adiciona um jogador convidado informando o nome, **Then** o convidado é adicionado à lista com `guest=true` e recebe um ID numérico sequencial após o último jogador da turma.
2. **Given** um convidado adicionado ao jogo, **When** outros jogadores visualizam a lista, **Then** o convidado aparece com indicação visual de que é um guest.

---

### Edge Cases

- O que acontece quando um jogador tenta confirmar presença no exato momento em que a última vaga é preenchida por outro jogador? (condição de corrida)
- O que acontece quando o organizador tenta adicionar um convidado em um jogo já lotado?
- O que acontece se o jogador perde a conexão durante uma mudança de status?
- O que acontece se dois jogadores tentam confirmar a última vaga simultaneamente?
- Como o sistema se comporta quando um jogador que não está na turma acessa o link do jogo?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE exibir a lista de todos os jogadores da turma agrupados por status (Confirmados, Recusados, Pendentes) ao acessar `/jogo/{gameId}`.
- **FR-002**: O sistema DEVE permitir que um jogador elegível confirme sua presença (status: "confirmed") quando houver vagas disponíveis.
- **FR-003**: O sistema DEVE permitir que um jogador recuse sua presença (status: "declined") a qualquer momento, independente de elegibilidade.
- **FR-004**: O sistema DEVE implementar toggle de confirmação: se o jogador já está "confirmed" e clica em confirmar novamente, seu status volta para "pending".
- **FR-005**: O sistema DEVE bloquear novas confirmações quando o número de confirmados for igual ao `totalPlayers` do jogo (jogo lotado).
- **FR-006**: O sistema DEVE reabrir o jogo para confirmações quando um jogador confirmado mudar para "pending" ou "declined" em um jogo lotado.
- **FR-007**: O sistema DEVE exibir um contador de vagas restantes (totalPlayers - confirmados).
- **FR-008**: O sistema DEVE exibir um indicador visual quando o jogo estiver lotado.
- **FR-009**: O sistema DEVE propagar todas as mudanças de status em tempo real para todos os usuários com a página aberta.
- **FR-010**: O sistema DEVE gravar um registro de auditoria na sub-collection `checkins` a cada mudança de status, contendo: tipo da operação, ID do jogador, nome do jogador, status anterior, novo status, timestamp e telemetria do dispositivo (IP, userAgent, deviceModel, screenResolution, language).
- **FR-011**: O sistema DEVE permitir que o organizador adicione jogadores convidados (guest) com flag `guest=true` e ID numérico sequencial após o último jogador da turma.
- **FR-012**: O sistema DEVE verificar a elegibilidade do jogador antes de permitir confirmação (integração com regras de elegibilidade da spec 003).
- **FR-013**: O sistema DEVE atualizar os campos `status` e `lastChange` no documento `games/{gameId}/players/{playerId}` a cada mudança de status.

### Key Entities

- **Game (Jogo)**: Representa uma partida criada com número máximo de jogadores (`totalPlayers`), data/hora e local. Contém a lista de jogadores e seus status.
- **Player (Jogador)**: Participante da turma ou convidado. Possui status de participação (pending, confirmed, declined), flag de guest e timestamp da última mudança.
- **Checkin (Registro de Auditoria)**: Log imutável de cada mudança de status, incluindo dados do jogador, status anterior/novo, timestamp e telemetria do dispositivo.
- **Turma**: Grupo fixo de jogadores (roster) ao qual o jogo pertence. Define quem são os jogadores elegíveis.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Jogadores conseguem confirmar ou recusar presença em menos de 5 segundos após acessar a página do jogo.
- **SC-002**: Mudanças de status são propagadas para todos os usuários conectados em menos de 2 segundos.
- **SC-003**: 100% das mudanças de status geram um registro de auditoria correspondente na sub-collection de checkins.
- **SC-004**: O sistema bloqueia confirmações com 100% de eficácia quando o jogo atinge lotação máxima (zero overbooking).
- **SC-005**: Jogadores conseguem visualizar o status atualizado de todos os participantes sem recarregar a página.

## Assumptions

- O jogo já foi criado previamente (spec 001 - Criação de Jogo) e possui `totalPlayers` definido.
- A elegibilidade do jogador é determinada por regras externas (spec 003 - Fila de Elegibilidade) que serão consultadas antes de permitir confirmação.
- O Firestore é utilizado como banco de dados e provê as funcionalidades de tempo real (listeners/snapshots).
- O link do jogo (`/jogo/{gameId}`) é compartilhado pelo organizador com os jogadores da turma.
- A identificação do jogador é feita pelo dispositivo/sessão (conforme implementação existente no projeto).
- Convidados não participam do sistema de elegibilidade — podem confirmar diretamente se houver vaga.
- A telemetria de dispositivo (IP, userAgent, etc.) é coletada automaticamente no momento da ação.
