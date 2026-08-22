# Feature Specification: Fila de Elegibilidade e Priorização de Jogadores

**Feature Branch**: `003-fila-elegibilidade`

**Created**: 2026-08-02

**Status**: Draft

**Input**: Sistema de priorização que determina quais jogadores podem confirmar presença em cada momento, garantindo equidade no acesso às vagas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Confirmação de Presença com Elegibilidade (Priority: P1)

Como jogador elegível, quero poder confirmar minha presença no jogo para garantir minha vaga, sabendo que minha posição na fila me permite confirmar neste momento.

**Why this priority**: É a funcionalidade central — sem ela, o sistema de fila não tem propósito. Entrega valor imediato ao controlar quem pode ou não confirmar.

**Independent Test**: Pode ser testado criando um jogo e verificando que apenas jogadores dentro do range elegível conseguem confirmar presença.

**Acceptance Scenarios**:

1. **Given** um jogo recém-criado com 14 vagas e 23 jogadores ativos na turma, **When** o jogador com prioridade 15 tenta confirmar presença, **Then** ele consegue confirmar (pois 14+1=15 elegíveis no momento da criação)
2. **Given** um jogo recém-criado com 14 vagas e 23 jogadores ativos na turma, **When** o jogador com prioridade 16 tenta confirmar presença, **Then** o botão de confirmação está desabilitado e ele vê um timer indicando quando será elegível
3. **Given** um jogo recém-criado com 14 vagas e 14 jogadores ativos na turma, **When** qualquer jogador tenta confirmar, **Then** todos conseguem confirmar imediatamente (todos elegíveis)

---

### User Story 2 - Abertura Progressiva de Slots por Tempo (Priority: P2)

Como jogador com prioridade mais baixa na fila, quero que slots adicionais abram progressivamente a cada 12 horas para que eu tenha a chance de confirmar presença mesmo estando mais atrás na fila.

**Why this priority**: Garante que a fila avance naturalmente mesmo sem ação de outros jogadores, dando previsibilidade ao sistema.

**Independent Test**: Pode ser testado simulando a passagem de tempo após a criação do jogo e verificando que jogadores com prioridades maiores se tornam elegíveis.

**Acceptance Scenarios**:

1. **Given** um jogo criado há 12 horas com 14 vagas e 23 jogadores ativos, **When** o sistema recalcula elegibilidade, **Then** 16 jogadores são elegíveis (14+1+1)
2. **Given** um jogo criado há 24 horas com 14 vagas e 23 jogadores ativos, **When** o sistema recalcula elegibilidade, **Then** 17 jogadores são elegíveis (14+1+2)
3. **Given** um jogo criado há 96 horas com 14 vagas e 23 jogadores ativos, **When** o sistema recalcula elegibilidade, **Then** todos os 23 jogadores são elegíveis (14+1+8=23, cap atingido)

---

### User Story 3 - Liberação de Slot por Decline de Jogador Elegível (Priority: P2)

Como jogador logo após o corte de elegibilidade, quero que quando um jogador elegível recusar, um slot extra seja aberto para mim, para que eu possa confirmar mais cedo.

**Why this priority**: Acelera a fila quando jogadores elegíveis não querem jogar, evitando vagas desperdiçadas por espera desnecessária.

**Independent Test**: Pode ser testado fazendo um jogador elegível recusar e verificando que o próximo jogador na fila se torna elegível.

**Acceptance Scenarios**:

1. **Given** um jogo com 15 jogadores elegíveis (prioridades 1-15) e jogador com prioridade 16 não-elegível, **When** o jogador com prioridade 10 recusa (decline), **Then** o jogador com prioridade 16 se torna elegível
2. **Given** um jogo com 15 jogadores elegíveis, **When** um jogador NÃO-elegível (prioridade 18) recusa, **Then** nenhum slot adicional é liberado
3. **Given** um jogo com 15 jogadores elegíveis e 2 declines de elegíveis já ocorridos, **When** o jogador com prioridade 8 recusa, **Then** mais um slot é liberado (total: 15+3=18 elegíveis)

---

### User Story 4 - Contagem Regressiva para Elegibilidade (Priority: P3)

Como jogador não-elegível, quero ver um timer indicando quando meu slot vai abrir para que eu possa me planejar.

**Why this priority**: Melhora a experiência do usuário com transparência, mas não é funcional para o core do sistema.

**Independent Test**: Pode ser testado verificando que jogadores não-elegíveis veem o timer com o tempo correto até sua elegibilidade.

**Acceptance Scenarios**:

1. **Given** um jogador com prioridade 17 e 15 jogadores atualmente elegíveis (sem declines), **When** ele visualiza a tela do jogo, **Then** vê "Sua vez em 24h 00m" (precisa de 2 slots extras × 12h cada)
2. **Given** um jogador com prioridade 16 e 15 jogadores atualmente elegíveis, **When** ele visualiza a tela do jogo, **Then** vê "Sua vez em 12h 00m" (precisa de 1 slot extra × 12h)
3. **Given** um jogador que se torna elegível enquanto visualiza a tela, **When** o timer chega a zero, **Then** o botão de confirmação é habilitado automaticamente

---

### User Story 5 - Gerenciamento da Prioridade do Roster (Priority: P1)

Como administrador da turma, quero poder reordenar a prioridade dos jogadores no roster para ajustar a justiça da fila ao longo do tempo.

**Why this priority**: É pré-requisito para o funcionamento da fila — sem um roster persistido com prioridades, o sistema não tem como determinar a ordem dos jogadores.

**Independent Test**: Pode ser testado acessando a interface de gerenciamento do roster e arrastando um jogador para uma nova posição, verificando que a prioridade é atualizada no Firestore.

**Acceptance Scenarios**:

1. **Given** um administrador visualizando o roster da turma "Sextou", **When** ele move o jogador "João" da prioridade 5 para prioridade 2, **Then** todos os jogadores entre as posições 2-4 são deslocados uma posição para baixo e a nova ordem é persistida
2. **Given** um administrador visualizando o roster, **When** ele desativa um jogador, **Then** o jogador não aparece mais na fila de elegibilidade dos próximos jogos
3. **Given** um administrador visualizando o roster, **When** ele reativa um jogador inativo, **Then** o jogador volta a aparecer na fila de elegibilidade com sua prioridade preservada

---

### User Story 6 - Penalidade de EffectiveId ao Voltar Após Decline (Priority: P3)

Como organizador, quero que jogadores que recusam e depois tentam voltar recebam uma penalidade na posição da fila para desincentivar reservas de vaga sem compromisso.

**Why this priority**: Mecanismo de fairness que previne abuso do sistema, mas é um refinamento que funciona sobre o core já implementado.

**Independent Test**: Pode ser testado fazendo um jogador recusar, outro jogador atrás confirmar a vaga liberada, e verificando que ao tentar voltar o primeiro jogador recebe um effectiveId penalizado.

**Acceptance Scenarios**:

1. **Given** jogador ID 5 elegível que recusou e jogador ID 16 que confirmou aproveitando o slot liberado, **When** jogador ID 5 tenta mudar para pendente, **Then** ele recebe um effectiveId maior que 5 (posição pior na fila)
2. **Given** jogador ID 5 elegível que recusou mas nenhum jogador posterior confirmou a vaga, **When** jogador ID 5 tenta voltar, **Then** ele mantém sua posição original (sem penalidade)

---

### Edge Cases

- O que acontece quando um jogador não-elegível tenta confirmar via manipulação direta? → O sistema deve ignorar/bloquear a ação
- O que acontece quando todos os jogadores elegíveis recusam? → Slots continuam abrindo até todos serem elegíveis
- O que acontece se o jogo é criado com `totalPlayers` igual ao número de jogadores ativos da turma? → Todos são elegíveis imediatamente, fila não se aplica
- O que acontece quando um jogador não-elegível recusa? → A recusa é registrada, mas não libera slot adicional
- O que acontece se o timer expira exatamente no momento de uma recusa de elegível? → Ambos os efeitos se acumulam (slot por tempo + slot por decline)
- O que acontece se a coleção `turmas/{turmaId}/players/` está vazia no Firestore? → O sistema realiza seeding automático a partir dos dados hardcoded, atribuindo priority sequencial

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE calcular o número de jogadores elegíveis usando a fórmula: `totalPlayers + 1 + floor(horasDesdeCreação / 12) + declinesDentroDoRange`
- **FR-002**: O sistema DEVE impedir jogadores não-elegíveis de confirmar presença (botão desabilitado na interface)
- **FR-003**: O sistema DEVE liberar um slot adicional quando um jogador ELEGÍVEL recusa participação
- **FR-004**: O sistema NÃO DEVE liberar slot adicional quando um jogador NÃO-ELEGÍVEL recusa
- **FR-005**: O sistema DEVE permitir que jogadores não-elegíveis recusem (decline) a qualquer momento
- **FR-006**: O sistema DEVE exibir uma contagem regressiva para jogadores não-elegíveis indicando quando seu slot abrirá
- **FR-007**: O sistema DEVE aplicar penalidade de effectiveId quando um jogador que recusou tenta voltar E outro jogador posterior confirmou aproveitando a vaga liberada
- **FR-008**: O sistema DEVE calcular a elegibilidade em tempo real no frontend (sem persistência no banco de dados)
- **FR-009**: O sistema DEVE considerar todos os jogadores elegíveis imediatamente quando `totalPlayers` é igual ao número total de jogadores ativos da turma
- **FR-010**: O sistema DEVE usar o campo "priority" do jogador (persistido no Firestore na coleção `turmas/{turmaId}/players/`) como posição na fila de elegibilidade
- **FR-011**: O sistema DEVE ler os jogadores ativos da turma a partir do Firestore, ordenados pelo campo "priority", ao criar um jogo ou calcular elegibilidade
- **FR-012**: O sistema DEVE permitir que o administrador reordene a prioridade dos jogadores no roster, persistindo a nova ordem no Firestore
- **FR-013**: O sistema DEVE permitir que o administrador ative/desative jogadores no roster; jogadores inativos não participam da fila de elegibilidade
- **FR-014**: O sistema DEVE realizar migração automática (seeding) caso a coleção `turmas/{turmaId}/players/` esteja vazia — utilizando os dados atuais hardcoded com priority igual à ordem numérica original dos IDs

### Key Entities *(include if feature involves data)*

- **Jogador (Roster)**: Documento persistido em `turmas/{turmaId}/players/{playerId}` com campos: `name` (string), `priority` (number — posição na fila), `active` (boolean), `effectiveId` (calculado em runtime quando penalizado, não persistido)
- **Jogo**: Possui `totalPlayers` (vagas disponíveis), `createdAt` (timestamp de criação), e pertence a uma turma
- **Turma**: Contém uma subcoleção `players/` com o roster persistido de jogadores ativos e inativos
- **Slot de Elegibilidade**: Conceito virtual calculado em tempo real — representa uma posição na fila que está aberta para confirmação
- **Decline**: Ação de recusa de um jogador; quando feita por jogador elegível, libera slot adicional

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Jogadores elegíveis conseguem confirmar presença em menos de 5 segundos após abrir a tela do jogo
- **SC-002**: 100% dos jogadores não-elegíveis são impedidos de confirmar presença antes do seu slot abrir
- **SC-003**: O timer de contagem regressiva é atualizado em tempo real com precisão de ±1 minuto
- **SC-004**: A abertura de slots ocorre corretamente a cada 12 horas, validável por qualquer jogador observando a mudança de estado
- **SC-005**: Jogadores que abusam do sistema (decline + retorno) são penalizados em 100% dos casos aplicáveis
- **SC-006**: A distribuição de vagas é percebida como justa por pelo menos 80% dos jogadores da turma

## Assumptions

- O roster de jogadores da turma é persistido no Firestore na coleção `turmas/{turmaId}/players/`
- Se a coleção estiver vazia, o sistema faz seeding automático a partir dos dados hardcoded existentes (prioridade = ordem numérica original)
- O campo "priority" é um número inteiro que determina a posição do jogador na fila (menor = mais prioritário)
- Apenas jogadores com `active: true` participam da fila de elegibilidade
- O cálculo de elegibilidade é feito exclusivamente no frontend (componente Angular), lendo dados do Firestore
- O campo `createdAt` do jogo já é persistido no Firestore
- O relógio do dispositivo do usuário é suficientemente preciso para o cálculo de tempo (tolerância de minutos)
- A funcionalidade de decline (recusa) já existe no sistema atual e será estendida com a lógica de liberação de slot
- O effectiveId é um conceito calculado em runtime, não persistido permanentemente
- O administrador da turma é qualquer jogador com permissão de gerenciar o roster (definição de permissão fora do escopo desta feature)
