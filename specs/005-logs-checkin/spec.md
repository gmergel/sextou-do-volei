# Feature Specification: Logs de Check-in (Auditoria)

**Feature Branch**: `005-logs-checkin`

**Created**: 2026-08-02

**Status**: Draft

**Input**: Tela de histórico detalhado de todas as interações em um jogo, servindo como trilha de auditoria completa para transparência e resolução de disputas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visualizar histórico de check-ins de um jogo (Priority: P1)

Como jogador, quero acessar a tela de logs de um jogo para ver todas as mudanças de status que aconteceram, com informações de quem fez o quê e quando, para ter transparência total sobre as interações.

**Why this priority**: É a funcionalidade central da feature — sem a visualização dos logs, nada mais tem valor.

**Independent Test**: Pode ser testado acessando a rota /jogo/{gameId}/logs e verificando que os registros de check-in são exibidos corretamente agrupados por data e em ordem cronológica reversa.

**Acceptance Scenarios**:

1. **Given** um jogo com registros de check-in existentes, **When** o jogador acessa /jogo/{gameId}/logs, **Then** todos os registros são exibidos agrupados por data com os mais recentes primeiro.
2. **Given** um jogo com registros em múltiplos dias, **When** o jogador visualiza os logs, **Then** existe um separador visual claro entre dias diferentes.
3. **Given** um registro de evento do tipo status_change, **When** exibido no log, **Then** mostra o nome do jogador, a transição de status (anterior → novo), horário formatado e informações do dispositivo.
4. **Given** um jogo sem nenhum registro de check-in, **When** o jogador acessa /jogo/{gameId}/logs, **Then** uma mensagem informativa indica que não há registros ainda.

---

### User Story 2 - Identificar tipo de evento visualmente (Priority: P2)

Como jogador, quero identificar rapidamente o tipo de cada evento (mudança de status, slot aberto, jogo lotado, jogo reaberto) através de ícones e formatação visual distintos, para facilitar a leitura do histórico.

**Why this priority**: Melhora significativamente a usabilidade da tela de logs, permitindo escaneamento rápido dos eventos.

**Independent Test**: Pode ser testado verificando que cada tipo de evento exibe um ícone diferenciado e uma descrição textual correspondente.

**Acceptance Scenarios**:

1. **Given** um evento do tipo `status_change`, **When** exibido no log, **Then** mostra um ícone indicativo de mudança de status, o nome do jogador e a transição (ex: "pending → confirmed").
2. **Given** um evento do tipo `slot_opened`, **When** exibido no log, **Then** mostra um ícone de vaga aberta e indica qual jogador liberou a vaga.
3. **Given** um evento do tipo `game_full`, **When** exibido no log, **Then** mostra um ícone de lotação máxima indicando que todas as vagas foram preenchidas.
4. **Given** um evento do tipo `game_reopened`, **When** exibido no log, **Then** mostra um ícone de reabertura indicando que uma vaga voltou a estar disponível.

---

### User Story 3 - Acessar logs a partir da página do jogo (Priority: P2)

Como jogador, quero ter um link/botão na página do jogo que me leve diretamente aos logs de check-in, para facilitar a navegação.

**Why this priority**: Sem um ponto de acesso claro, os jogadores não saberão como chegar à tela de logs.

**Independent Test**: Pode ser testado navegando até a página de um jogo e verificando que existe um link visível que leva à rota /jogo/{gameId}/logs.

**Acceptance Scenarios**:

1. **Given** a página de um jogo específico, **When** o jogador procura a opção de logs, **Then** existe um link/botão claramente identificável que navega para /jogo/{gameId}/logs.
2. **Given** o jogador clica no link de logs, **When** a navegação ocorre, **Then** a tela de logs é exibida com os registros do jogo correto.

---

### User Story 4 - Verificar informações de dispositivo para auditoria (Priority: P3)

Como jogador, quero ver as informações do dispositivo associadas a cada registro de check-in (SO, navegador, modelo), para poder resolver disputas e detectar uso indevido.

**Why this priority**: Suporta o propósito de auditoria e resolução de disputas, mas é informação complementar.

**Independent Test**: Pode ser testado verificando que cada registro exibe informações de dispositivo como texto secundário.

**Acceptance Scenarios**:

1. **Given** um registro de check-in com telemetria de dispositivo, **When** exibido no log, **Then** mostra informações de SO, navegador e modelo do dispositivo como detalhe secundário.
2. **Given** um registro de check-in sem telemetria de dispositivo (dados ausentes), **When** exibido no log, **Then** as informações de dispositivo são omitidas sem erro.

---

### Edge Cases

- O que acontece quando o jogo não existe (gameId inválido)? Sistema exibe mensagem de erro adequada.
- O que acontece quando há centenas de registros em um único dia? O agrupamento por data se mantém funcional com scroll.
- O que acontece quando o jogador referenciado no log foi removido? O nome do jogador é exibido normalmente (dados históricos preservados).
- O que acontece quando o dispositivo não fornece todas as informações de telemetria? Campos ausentes são omitidos da exibição.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema DEVE exibir todos os registros de check-in de um jogo específico na rota /jogo/{gameId}/logs.
- **FR-002**: Sistema DEVE agrupar os registros por data, com separadores visuais entre dias diferentes.
- **FR-003**: Sistema DEVE ordenar os registros em ordem cronológica reversa (mais recentes primeiro).
- **FR-004**: Sistema DEVE exibir para cada registro: tipo do evento (com ícone), nome do jogador, transição de status, timestamp formatado (hora:minuto) e informações do dispositivo.
- **FR-005**: Sistema DEVE suportar quatro tipos de eventos: `status_change`, `slot_opened`, `game_full` e `game_reopened`.
- **FR-006**: Sistema DEVE exibir informações de telemetria do dispositivo (IP, user agent, modelo, resolução, idioma) como detalhe secundário em cada registro.
- **FR-007**: Sistema DEVE fornecer um link de acesso aos logs a partir da página do jogo.
- **FR-008**: Sistema DEVE consumir os dados da collection `games/{gameId}/checkins` como stream ordenado por timestamp descendente.
- **FR-009**: Sistema DEVE exibir uma mensagem informativa quando não houver registros de check-in para o jogo.
- **FR-010**: Sistema DEVE diferenciar visualmente cada tipo de evento com ícones distintos.

### Key Entities

- **CheckinLog**: Registro individual de evento contendo type, playerId, playerName, previousStatus, newStatus, timestamp e dados de telemetria do dispositivo.
- **DeviceTelemetry**: Informações do dispositivo capturadas no momento do check-in (ip, userAgent, deviceModel, screenResolution, language).
- **Game**: Jogo existente que contém a subcollection de logs de check-in.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Jogadores conseguem visualizar o histórico completo de check-ins de um jogo em menos de 5 segundos após acessar a rota.
- **SC-002**: 100% dos eventos de mudança de status são registrados e visíveis nos logs com dados de dispositivo.
- **SC-003**: Jogadores conseguem identificar o tipo de evento de qualquer registro em menos de 2 segundos (via ícones visuais).
- **SC-004**: Disputas entre jogadores podem ser resolvidas consultando a trilha de auditoria sem necessidade de intervenção do administrador.
- **SC-005**: Jogadores conseguem navegar da página do jogo para os logs em no máximo 1 clique.

## Assumptions

- O projeto já possui a collection `games/{gameId}/checkins` no Firestore com os dados de check-in sendo gravados por outras features.
- O DeviceInfoService já existe e está sendo utilizado para capturar telemetria do dispositivo em outras partes do app.
- Todos os jogadores do grupo têm acesso de leitura aos logs (sem restrição de permissão).
- A tela de logs é somente leitura — não há ações de edição ou exclusão de registros.
- Os dados históricos de jogadores (nome) são preservados nos registros de log mesmo se o jogador for removido do jogo.
- A rota /jogo/{gameId}/logs segue o padrão de roteamento já existente no app Angular.
