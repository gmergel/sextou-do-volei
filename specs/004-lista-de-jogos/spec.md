# Feature Specification: Lista de Jogos

**Feature Branch**: `004-lista-de-jogos`

**Created**: 2026-08-02

**Status**: Draft

**Input**: Documentação da funcionalidade existente "Lista de Jogos" (Dashboard) no app Sextou do Vôlei

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visualizar jogos criados (Priority: P1)

O jogador abre o app e é direcionado automaticamente para a lista de jogos, onde vê todos os jogos criados em ordem cronológica reversa (mais recentes primeiro). Cada card exibe a turma, data formatada, horário, local e contagem de confirmados.

**Why this priority**: É a funcionalidade central da tela — sem a lista de jogos visível, nenhuma outra interação é possível.

**Independent Test**: Pode ser testado verificando que ao acessar "/" ou "/jogos", a lista de jogos é exibida com todos os jogos do Firestore ordenados por data de criação decrescente, cada um com as informações corretas no card.

**Acceptance Scenarios**:

1. **Given** existem jogos criados no sistema, **When** o jogador acessa a rota "/" ou "/jogos", **Then** todos os jogos são exibidos em cards ordenados por data de criação (mais recentes primeiro)
2. **Given** um jogo existe com turma "#Sextou do Vôlei", data "2026-08-01", horário "19h–21h", local "My Beach", **When** o jogador visualiza a lista, **Then** o card exibe corretamente: badge da turma, "Sexta, 01/08/2026", "19h–21h", "My Beach"
3. **Given** um jogo tem 10 jogadores confirmados de um total de 14, **When** o jogador visualiza o card, **Then** é exibido o badge "10/14 confirmados"
4. **Given** o jogador está na lista de jogos, **When** novos jogos são criados ou atualizados no Firestore, **Then** a lista é atualizada automaticamente em tempo real (sem refresh manual)

---

### User Story 2 - Navegar para detalhes de um jogo (Priority: P1)

O jogador vê um jogo na lista e clica nele para acessar a página de jogadores daquele jogo, onde pode confirmar presença.

**Why this priority**: A navegação para o jogo é o objetivo principal do dashboard — o jogador precisa conseguir acessar o jogo para interagir com ele.

**Independent Test**: Pode ser testado clicando em um card de jogo na lista e verificando que o app navega para a rota "/jogo/{gameId}" correta.

**Acceptance Scenarios**:

1. **Given** o jogador está na lista de jogos, **When** clica em um card de jogo, **Then** o app navega para "/jogo/{gameId}" correspondente ao jogo selecionado
2. **Given** o jogador está na lista de jogos, **When** clica em qualquer parte do card, **Then** a navegação é acionada (área clicável é o card inteiro)

---

### User Story 3 - Criar novo jogo a partir do dashboard (Priority: P2)

O organizador está na lista de jogos e deseja criar um novo jogo, utilizando o botão flutuante (FAB) para navegar até o formulário de criação.

**Why this priority**: A criação de jogos é uma ação frequente do organizador, mas secundária à visualização e navegação que todos os jogadores utilizam.

**Independent Test**: Pode ser testado clicando no FAB e verificando que o app navega para "/jogo/novo".

**Acceptance Scenarios**:

1. **Given** o jogador está na lista de jogos, **When** clica no FAB (botão flutuante), **Then** o app navega para a rota "/jogo/novo" (formulário de criação de jogo)
2. **Given** o jogador está na lista de jogos, **When** visualiza a tela, **Then** o FAB está sempre visível e acessível independente do scroll

---

### User Story 4 - Visualizar estado vazio (Priority: P3)

O jogador acessa o app pela primeira vez ou quando não existem jogos criados e vê uma mensagem informativa de estado vazio.

**Why this priority**: Cenário pouco frequente mas necessário para uma boa experiência de primeiro acesso.

**Independent Test**: Pode ser testado acessando a lista quando não há jogos no Firestore e verificando que a mensagem de estado vazio é exibida.

**Acceptance Scenarios**:

1. **Given** não existem jogos criados no sistema, **When** o jogador acessa "/jogos", **Then** é exibida uma mensagem informativa indicando que não há jogos criados
2. **Given** não existem jogos criados, **When** o jogador visualiza o estado vazio, **Then** uma orientação sobre aguardar a criação de um jogo é exibida

---

### User Story 5 - Indicação visual de jogo lotado (Priority: P3)

O jogador visualiza na lista quais jogos já atingiram a capacidade máxima, permitindo identificar rapidamente onde ainda há vagas.

**Why this priority**: Informação útil mas complementar — o jogador pode ver a contagem numérica mesmo sem indicação visual destacada.

**Independent Test**: Pode ser testado criando um jogo com capacidade 14 e 14 jogadores confirmados, e verificando que o card recebe indicação visual diferenciada (badge ou estilo).

**Acceptance Scenarios**:

1. **Given** um jogo tem confirmados igual ao total de vagas, **When** o jogador visualiza o card na lista, **Then** uma indicação visual diferenciada sinaliza que o jogo está lotado
2. **Given** um jogo tem confirmados menor que o total de vagas, **When** o jogador visualiza o card na lista, **Then** a indicação de lotado NÃO é exibida

---

### Edge Cases

- O que acontece quando a conexão com o Firestore é perdida durante a visualização da lista?
- Como o sistema se comporta durante o carregamento inicial dos dados (estado de loading)?
- O que acontece quando um jogo é excluído por outro usuário enquanto o jogador está visualizando a lista?
- Como o sistema lida com jogos que têm dados incompletos (ex: sem local ou sem horário)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE exibir todos os jogos criados em ordem cronológica reversa (mais recentes primeiro, ordenados por campo createdAt descendente)
- **FR-002**: Cada card de jogo DEVE exibir: badge da turma, data formatada, horário, local e contagem de confirmados/total
- **FR-003**: A rota "/jogos" DEVE ser a rota padrão do aplicativo — a rota "/" DEVE redirecionar automaticamente para "/jogos"
- **FR-004**: O sistema DEVE disponibilizar um FAB (Floating Action Button) que navega para "/jogo/novo" ao ser acionado
- **FR-005**: O sistema DEVE navegar para "/jogo/{gameId}" ao clicar em um card de jogo
- **FR-006**: Os dados DEVEM ser carregados em tempo real via stream do Firestore (atualizações automáticas sem refresh manual)
- **FR-007**: O sistema DEVE exibir um estado de loading (skeleton cards) enquanto os dados estão sendo carregados
- **FR-008**: O sistema DEVE exibir uma mensagem de estado vazio quando não existem jogos criados
- **FR-009**: O sistema DEVE exibir indicação visual diferenciada quando um jogo atinge a capacidade máxima (lotado)
- **FR-010**: A data DEVE ser formatada no padrão legível em português (ex: "Sexta, 01/08/2026")
- **FR-011**: O badge da turma DEVE exibir o nome identificador ("#Sextou do Vôlei" ou "#Domingou do Vôlei") com estilo visual diferenciado por turma
- **FR-012**: A lista DEVE exibir todos os jogos sem paginação ou filtros (lista completa)

### Key Entities

- **Jogo (Game)**: Sessão de vôlei agendada. Atributos relevantes para a lista: turma, date, time, location, totalPlayers, createdAt.
- **Jogador (Player)**: Sub-coleção do jogo. Relevante para contagem de confirmados (status = 'confirmed').
- **Turma**: Identificador do grupo ("#Sextou do Vôlei" ou "#Domingou do Vôlei") com rótulo e estilo visual associados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A lista de jogos é exibida completamente em até 3 segundos após o primeiro acesso do usuário
- **SC-002**: Atualizações em tempo real (novo jogo criado, jogador confirmado) são refletidas na lista em até 2 segundos sem intervenção do usuário
- **SC-003**: O jogador consegue identificar e acessar o jogo desejado em menos de 5 segundos (da visualização da lista ao clique no card)
- **SC-004**: 100% dos jogos existentes são exibidos na lista (nenhum jogo é omitido)
- **SC-005**: A contagem de confirmados reflete corretamente o número de jogadores com status "confirmed" em cada jogo

## Assumptions

- O jogador possui acesso ao aplicativo (autenticação é tratada em outra feature)
- A collection "games" no Firestore já existe e é populada pela funcionalidade de criação de jogo
- A contagem de confirmados é derivada da sub-collection "players" de cada jogo (jogadores com status = 'confirmed')
- Não há necessidade de paginação ou filtros neste momento — o volume de jogos é suficientemente pequeno para exibição completa
- O stream do Firestore fornece atualizações em tempo real sem necessidade de polling
- O layout é otimizado para dispositivos móveis (uso primário do app)
