# Feature Specification: Criação de Jogo

**Feature Branch**: `001-criacao-de-jogo`

**Created**: 2026-08-02

**Status**: Draft

**Input**: Documentação da funcionalidade existente "Criação de Jogo" no app Sextou do Vôlei

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Criar jogo com turma Sextou (Priority: P1)

O organizador abre o formulário de criação de jogo, seleciona a turma "#Sextou do Vôlei", confirma a data sugerida (próxima sexta-feira), escolhe o horário 19h–21h, seleciona o local "My Beach" dos locais pré-cadastrados, mantém a capacidade padrão de 14 jogadores e confirma a criação.

**Why this priority**: É o fluxo principal e mais frequente — a maioria dos jogos são criados para sexta-feira com configurações padrão.

**Independent Test**: Pode ser testado criando um jogo completo e verificando que o documento é gravado no Firestore com todos os campos corretos e os 23 jogadores da turma inseridos com status "pending".

**Acceptance Scenarios**:

1. **Given** o organizador está na tela de criação de jogo, **When** seleciona turma "#Sextou do Vôlei", **Then** a próxima sexta-feira é sugerida automaticamente como data
2. **Given** a turma "#Sextou do Vôlei" está selecionada, **When** visualiza opções de horário, **Then** os presets disponíveis são 19h–21h e 20h–22h
3. **Given** todos os campos estão preenchidos, **When** confirma a criação, **Then** o jogo é gravado no Firestore com turma, data, horário, local, endereço, capacidade e timestamp de criação
4. **Given** o jogo foi criado para turma Sextou, **When** a criação é finalizada, **Then** os 23 jogadores fixos da turma são inseridos na sub-collection "players" com status "pending"

---

### User Story 2 - Criar jogo com turma Domingou (Priority: P1)

O organizador cria um jogo para a turma "#Domingou do Vôlei", com horários e jogadores específicos dessa turma.

**Why this priority**: Igualmente importante ao Sextou — é o segundo grupo recorrente e usa o mesmo fluxo com variações.

**Independent Test**: Pode ser testado criando um jogo para Domingou e verificando que os presets de horário corretos são exibidos e os 23 jogadores fixos são inseridos.

**Acceptance Scenarios**:

1. **Given** o organizador está na tela de criação de jogo, **When** seleciona turma "#Domingou do Vôlei", **Then** o próximo domingo é sugerido automaticamente como data
2. **Given** a turma "#Domingou do Vôlei" está selecionada, **When** visualiza opções de horário, **Then** os presets disponíveis são 10h–12h, 15h–17h e 16h–18h
3. **Given** o jogo foi criado para turma Domingou, **When** a criação é finalizada, **Then** os 23 jogadores fixos da turma são inseridos na sub-collection "players" com status "pending"

---

### User Story 3 - Selecionar local via busca de endereço (Priority: P2)

O organizador precisa jogar em um local diferente dos pré-cadastrados e utiliza a busca de endereço via OpenStreetMap para encontrar e selecionar o local.

**Why this priority**: A maioria dos jogos ocorre nos locais pré-cadastrados, mas a flexibilidade de buscar novos locais é necessária para situações esporádicas.

**Independent Test**: Pode ser testado digitando um endereço na busca, verificando que resultados do Nominatim são retornados, selecionando um resultado e confirmando que o endereço completo é gravado junto ao jogo.

**Acceptance Scenarios**:

1. **Given** o organizador está no campo de seleção de local, **When** digita um endereço na busca, **Then** resultados da API Nominatim (OpenStreetMap) são exibidos
2. **Given** resultados de busca são exibidos, **When** o organizador seleciona um resultado, **Then** o nome do local e o endereço completo são preenchidos
3. **Given** um local foi selecionado via busca, **When** o jogo é criado, **Then** o endereço completo (locationAddress) é gravado junto ao documento do jogo

---

### User Story 4 - Alterar capacidade de jogadores (Priority: P3)

O organizador ajusta a capacidade máxima de jogadores para um valor diferente do padrão (14).

**Why this priority**: A maioria dos jogos usa a capacidade padrão. Alterar é uma necessidade ocasional.

**Independent Test**: Pode ser testado alterando o campo de capacidade para um valor diferente de 14 e verificando que o valor correto é gravado no campo "totalPlayers" do Firestore.

**Acceptance Scenarios**:

1. **Given** o organizador está no formulário de criação, **When** visualiza o campo de capacidade, **Then** o valor padrão é 14
2. **Given** o organizador alterou a capacidade para 12, **When** confirma a criação, **Then** o jogo é gravado com totalPlayers = 12

---

### Edge Cases

- O que acontece quando não há próxima data disponível (ex: seleção manual de data passada)?
- Como o sistema se comporta quando a API Nominatim está indisponível ou retorna erro?
- O que acontece se o organizador tenta criar um jogo com capacidade menor que o mínimo viável (ex: 0 ou negativo)?
- Como o sistema lida com tentativas de criação duplicada para a mesma turma/data/horário?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE permitir selecionar uma das duas turmas: "#Sextou do Vôlei" ou "#Domingou do Vôlei"
- **FR-002**: O sistema DEVE sugerir automaticamente a próxima data correspondente ao dia da semana da turma selecionada (sexta-feira para Sextou, domingo para Domingou)
- **FR-003**: O sistema DEVE exibir presets de horário específicos por turma:
  - Sextou: 19h–21h, 20h–22h
  - Domingou: 10h–12h, 15h–17h, 16h–18h
- **FR-004**: O sistema DEVE oferecer seleção de local com locais pré-cadastrados: My Beach, It's Nilo, MB, Meca, ASTTI
- **FR-005**: O sistema DEVE permitir busca de endereço via API Nominatim (OpenStreetMap) como alternativa aos locais pré-cadastrados
- **FR-006**: O sistema DEVE gravar o endereço completo (locationAddress) junto ao local selecionado
- **FR-007**: O sistema DEVE exibir capacidade de jogadores com valor padrão de 14, permitindo alteração pelo organizador
- **FR-008**: O sistema DEVE, ao criar o jogo, inserir todos os jogadores fixos da turma com status "pending":
  - Sextou: 23 jogadores fixos
  - Domingou: 23 jogadores fixos
- **FR-009**: O sistema DEVE registrar um timestamp de criação (createdAt) no documento do jogo
- **FR-010**: O sistema DEVE gravar os seguintes dados no documento do jogo: turma, date, time, location, locationAddress, totalPlayers, createdAt
- **FR-011**: O sistema DEVE gravar cada jogador na sub-collection com: id, name, initial, status='pending', lastChange

### Key Entities

- **Jogo (Game)**: Representa uma sessão de vôlei de praia agendada. Contém turma, data, horário, local, endereço, capacidade e timestamp de criação.
- **Turma**: Grupo recorrente de jogadores ("#Sextou do Vôlei" ou "#Domingou do Vôlei") com dia da semana fixo, lista de jogadores e presets de horário específicos.
- **Jogador (Player)**: Membro de uma turma que é automaticamente inserido ao jogo com status inicial "pending". Possui nome, inicial e controle de última alteração.
- **Local (Location)**: Pode ser um dos locais pré-cadastrados ou um endereço encontrado via busca. Sempre acompanhado do endereço completo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O organizador consegue criar um jogo completo (da seleção de turma até a confirmação) em menos de 30 segundos usando configurações padrão
- **SC-002**: 100% dos jogadores fixos da turma são inseridos automaticamente com status "pending" ao criar o jogo
- **SC-003**: A data sugerida corresponde sempre à próxima ocorrência do dia da semana da turma selecionada
- **SC-004**: Busca de endereço retorna resultados relevantes para o usuário em até 3 segundos
- **SC-005**: Todos os campos obrigatórios são gravados corretamente no banco de dados sem perda de informação

## Assumptions

- O organizador possui acesso autenticado ao aplicativo (autenticação é tratada em outra feature)
- Os jogadores fixos de cada turma já estão cadastrados no sistema
- A lista de locais pré-cadastrados é fixa e não requer gerenciamento dinâmico nesta feature
- A API Nominatim está disponível publicamente sem necessidade de autenticação ou chave de API
- Apenas um organizador cria jogos (não há cenário de criação concorrente para a mesma turma/data)
- A capacidade de jogadores (totalPlayers) é um limite informativo — o controle de confirmações é tratado em outra feature
