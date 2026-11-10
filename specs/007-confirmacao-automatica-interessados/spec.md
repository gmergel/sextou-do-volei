# Feature Specification: Confirmação Automática de Jogadores Interessados

**Feature Branch**: `main` (branch atual; nenhuma nova branch criada nesta etapa)

**Created**: 2026-11-10

**Status**: Draft

**Input**: Jogadores podem registrar interesse sem reservar vaga, inclusive fora da elegibilidade da fila. Enquanto houver uma lista do jogo aberta e online, interessados elegíveis devem ser confirmados automaticamente quando houver vaga, pela prioridade atual da fila, sem novo clique. A regra atende regulares e convidados, preserva lotação, elegibilidade e logs, e mantém os demais interessados aguardando.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar Interesse sem Ocupar Vaga (Priority: P1)

Como jogador ainda não elegível ou sem vaga disponível, quero registrar meu interesse em participar para aguardar minha oportunidade sem precisar tentar confirmar repetidamente e sem receber uma garantia de vaga.

**Why this priority**: Define a diferença entre intenção de jogar e presença confirmada, permitindo aguardar sem contornar as regras da fila.

**Independent Test**: Pode ser testado registrando interesse de um jogador fora da elegibilidade, verificando a indicação de espera e comparando a quantidade de confirmados e de vagas antes e depois.

**Acceptance Scenarios**:

1. **Given** um jogador não elegível e um jogo com vagas, **When** ele registra interesse, **Then** fica interessado e aguardando, não é confirmado e não altera nem reserva vagas.
2. **Given** um jogo cheio e um jogador não confirmado, elegível ou não, **When** ele registra interesse, **Then** o interesse é aceito, a lotação não muda e a interface informa que o interesse não garante vaga.
3. **Given** um jogador interessado e ainda não confirmado, **When** ele retira o interesse, **Then** deixa de participar da seleção automática sem alterar a quantidade de vagas.
4. **Given** um jogador aguardando, **When** a lista é visualizada, **Then** sua indicação de interesse é distinta de presença confirmada e esclarece que a confirmação depende de vaga, elegibilidade e prioridade.

---

### User Story 2 - Confirmar Automaticamente pela Prioridade da Fila (Priority: P1)

Como jogador interessado, quero que minha presença seja confirmada automaticamente quando houver vaga e eu for o primeiro interessado elegível pela fila, sem precisar de outro clique.

**Why this priority**: É o resultado central da funcionalidade e impede que a velocidade de clique substitua a prioridade já estabelecida.

**Independent Test**: Pode ser testado com um jogo cheio e três interessados, registrando interesse em ordem inversa à prioridade e liberando uma única vaga com a lista aberta e online.

**Acceptance Scenarios**:

1. **Given** uma lista aberta e online, um jogo cheio e três interessados elegíveis, **When** um confirmado libera sua vaga, **Then** somente o interessado de maior prioridade atual é confirmado automaticamente e os demais permanecem interessados e aguardando.
2. **Given** dois interessados elegíveis, sendo que o de menor prioridade registrou interesse primeiro, **When** uma vaga fica disponível, **Then** o de maior prioridade é confirmado, independentemente da ordem de registro do interesse.
3. **Given** uma vaga disponível e um interessado que ainda não é elegível, **When** ele se torna elegível pelas regras existentes enquanto a lista está aberta e online, **Then** é confirmado automaticamente se for o primeiro interessado elegível.
4. **Given** uma vaga disponível, um interessado de maior prioridade não elegível e outro de menor prioridade elegível, **When** a seleção automática ocorre, **Then** o elegível é confirmado e o não elegível continua aguardando sem reservar a vaga.
5. **Given** vagas disponíveis e nenhum interessado elegível, **When** a lista é atualizada, **Then** nenhuma confirmação automática ocorre e as vagas continuam disponíveis.
6. **Given** duas vagas disponíveis e três interessados elegíveis, **When** a seleção automática ocorre, **Then** os dois primeiros são confirmados sucessivamente pela prioridade vigente e o terceiro permanece aguardando.
7. **Given** uma vaga disponível e um jogador já elegível, **When** ele registra interesse com a lista aberta e online, **Then** é considerado automaticamente, sem segundo clique, respeitando interessados elegíveis de maior prioridade.

---

### User Story 3 - Aplicar a Mesma Regra a Regulares e Convidados (Priority: P1)

Como participante, quero que regulares e convidados interessados sejam considerados conforme a elegibilidade e a posição que já possuem no jogo, sem privilégios ou exclusões introduzidos pela automação.

**Why this priority**: Evita que a automação altere a política de acesso às vagas ou deixe convidados elegíveis sem atendimento.

**Independent Test**: Pode ser testado com um regular e um convidado interessados, variando a elegibilidade e a ordem válida para o jogo, e liberando uma vaga.

**Acceptance Scenarios**:

1. **Given** um convidado interessado e elegível como primeiro candidato da fila e uma vaga disponível, **When** a seleção ocorre, **Then** o convidado é confirmado automaticamente como ocorreria com um jogador regular.
2. **Given** um regular interessado elegível e um convidado interessado ainda não elegível, **When** uma vaga fica disponível, **Then** somente o regular pode ser confirmado e o convidado continua aguardando.
3. **Given** interessados cuja ordem efetiva foi alterada por uma penalidade já prevista nas regras de retorno após recusa, **When** uma vaga é disputada, **Then** a seleção respeita a ordem efetiva válida, sem restaurar a posição anterior nem ignorar a penalidade.

---

### User Story 4 - Preservar Lotação e Histórico com Listas Simultâneas (Priority: P1)

Como organizador, quero que várias pessoas possam acompanhar o jogo ao mesmo tempo sem confirmar jogadores além da capacidade nem duplicar registros de confirmação.

**Why this priority**: Lotação correta e histórico confiável são indispensáveis para que o preenchimento automático não gere conflitos.

**Independent Test**: Pode ser testado abrindo a mesma lista em duas sessões online, liberando a última vaga e verificando confirmados, interessados restantes e histórico.

**Acceptance Scenarios**:

1. **Given** duas listas abertas e online, uma vaga e vários interessados elegíveis, **When** ambas observam a vaga, **Then** ocorre uma única confirmação efetiva para o primeiro interessado elegível e a capacidade não é excedida.
2. **Given** a última vaga e uma confirmação manual concorrente à seleção automática, **When** as ações são processadas, **Then** no máximo uma nova presença é confirmada, respeitando as regras vigentes; quem não obtiver a vaga continua sem confirmação, mantendo seu interesse se o tiver registrado.
3. **Given** uma confirmação automática concluída, **When** as listas recebem novamente o mesmo estado ou são reabertas, **Then** não ocorre nova confirmação do mesmo jogador nem duplicação do respectivo log.
4. **Given** uma falha que impede concluir a confirmação, **When** a lista apresenta o resultado ao usuário, **Then** não informa confirmação concluída nem registra sucesso inexistente; após restabelecer a conexão, apresenta o estado efetivamente salvo.
5. **Given** uma confirmação automática efetivada, **When** o histórico é consultado, **Then** há um registro da mudança para confirmado, associado ao jogador e ao jogo, com data/hora e indicação de origem automática, preservando o histórico anterior.

---

### User Story 5 - Retomar a Seleção ao Abrir a Lista (Priority: P2)

Como participante, quero que a lista considere os interesses já registrados ao ser aberta ou recuperar a conexão, sem depender de o próprio interessado estar online.

**Why this priority**: Delimita a disponibilidade da automação e evita que uma oportunidade existente seja ignorada até ocorrer uma nova liberação de vaga.

**Independent Test**: Pode ser testado deixando um interessado e uma vaga disponíveis sem listas abertas, e depois abrindo a lista em outro dispositivo.

**Acceptance Scenarios**:

1. **Given** nenhum cliente com a lista aberta e online, **When** houver vaga e interessado elegível, **Then** não há exigência de confirmação automática durante esse período.
2. **Given** interesses já registrados e vaga disponível, **When** qualquer participante abre a lista e obtém o estado atualizado online, **Then** o primeiro interessado elegível é confirmado automaticamente, mesmo que o próprio interessado não esteja online.
3. **Given** uma lista que perdeu a conexão, **When** ela volta a ficar online, **Then** reavalia vagas, interesses e elegibilidade atuais sem usar o estado desatualizado para garantir uma vaga.

### Edge Cases

- **Jogo cheio**: Novos interesses podem ser registrados, mas nenhuma confirmação ocorre até existir capacidade.
- **Elegibilidade não é vaga**: A abertura de uma posição na fila não aumenta a capacidade do jogo; um interessado recém-elegível continua aguardando se o jogo estiver cheio.
- **Mudanças simultâneas**: Liberação de vaga e avanço da elegibilidade são considerados segundo o estado válido no momento da confirmação, sem ultrapassar a capacidade.
- **Retirada ou recusa durante a seleção**: Se a retirada do interesse ou a recusa já estiver efetivada, o jogador não pode ser confirmado por uma seleção baseada no interesse anterior.
- **Desistência após confirmação automática**: O jogador pode liberar a vaga pelos controles existentes; sua intenção anterior não deve reconfirmá-lo imediatamente.
- **Mudança de prioridade ou elegibilidade durante a seleção**: O resultado deve respeitar as regras válidas para aquele jogo no momento de efetivar a confirmação, incluindo penalidades existentes.
- **Lista desatualizada ou sem conexão**: Uma indicação local não garante vaga nem substitui o resultado efetivamente salvo; interesses salvos anteriormente não são descartados por falha de confirmação.
- **Vários clientes ou eventos repetidos**: O mesmo jogador não pode ocupar mais de uma vaga nem gerar múltiplos logs para a mesma confirmação efetiva.
- **Interesse em jogos diferentes**: O interesse em um jogo não inscreve nem confirma o jogador em outro.
- **Sem candidatos aptos**: Não confirmar jogadores sem interesse, não elegíveis ou que já estejam confirmados apenas para preencher vagas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE permitir registrar interesse por jogo para jogadores regulares e convidados ainda não confirmados, inclusive fora da elegibilidade ou com o jogo cheio.
- **FR-002**: O interesse isolado NÃO DEVE confirmar presença, ocupar ou reservar vaga, alterar a prioridade do jogador nem ampliar sua elegibilidade.
- **FR-003**: O sistema DEVE exibir interesse/aguardando de forma distinta de confirmação e informar que o interesse não garante vaga, pois depende de disponibilidade, elegibilidade e prioridade.
- **FR-004**: Enquanto existir ao menos uma lista do jogo aberta e online, o sistema DEVE reavaliar os interessados ao carregar ou retomar a lista, liberar vaga, registrar interesse ou mudar a elegibilidade ou a ordem aplicável ao jogo.
- **FR-005**: Havendo vaga, o sistema DEVE confirmar automaticamente, sem clique adicional, o primeiro interessado elegível pela ordem de prioridade atual da fila do jogo. O horário ou a ordem do registro de interesse NÃO DEVE definir preferência.
- **FR-006**: Para uma única vaga, somente um interessado DEVE ser confirmado; os demais DEVEM continuar interessados e aguardando. Para várias vagas, a seleção DEVE se repetir pela ordem vigente até esgotar as vagas ou os interessados elegíveis.
- **FR-007**: A seleção DEVE ignorar interessados não elegíveis sem reservar vagas para eles; se não houver interessado elegível, nenhuma confirmação automática DEVE ocorrer.
- **FR-008**: O sistema DEVE aplicar aos regulares e convidados as regras de elegibilidade e prioridade já existentes, incluindo avanço por tempo, efeitos de recusas e penalidades de retorno. A automação NÃO DEVE alterar essas regras nem a versão da lista de jogadores aplicável ao jogo.
- **FR-009**: Antes de efetivar cada confirmação, o sistema DEVE garantir que o jogador ainda esteja interessado, elegível, não confirmado e seja o primeiro candidato válido, e que exista vaga no estado atual do jogo.
- **FR-010**: O total de confirmados NÃO DEVE exceder a capacidade do jogo, mesmo com várias listas abertas, eventos repetidos ou confirmações manuais concorrentes. Um jogador NÃO DEVE ser confirmado mais de uma vez para a mesma ocupação de vaga.
- **FR-011**: A confirmação automática DEVE produzir os mesmos efeitos de ocupação de vaga e atualização da lista que uma confirmação válida existente, tornando o resultado visível nas listas online sem recarregamento manual.
- **FR-012**: Cada confirmação automática efetiva DEVE preservar os logs existentes e gerar um único registro da mudança de participação com jogador, jogo, data/hora, estado anterior, estado confirmado e indicação de origem automática. A origem NÃO DEVE ser apresentada como um clique manual do interessado.
- **FR-013**: O sistema DEVE permitir retirar o interesse antes da confirmação. A recusa DEVE encerrar o interesse; após confirmação, a intenção de espera DEVE ser considerada atendida, para que uma desistência posterior não gere reconfirmação sem novo interesse explícito.
- **FR-014**: Interesses registrados com sucesso DEVEM permanecer associados ao jogo após fechar ou reabrir a lista. A automação NÃO DEVE exigir que o dispositivo do interessado esteja aberto: qualquer lista do mesmo jogo aberta e online é suficiente.
- **FR-015**: Sem nenhuma lista aberta e online, a confirmação automática NÃO é exigida. Ao abrir ou reconectar uma lista, o sistema DEVE considerar o estado atualizado, sem exigir nova liberação de vaga ou novo registro de interesse.
- **FR-016**: Em falha ou conflito, o sistema NÃO DEVE apresentar sucesso inexistente nem perder um interesse ainda válido. Ao recuperar a conexão, DEVE apresentar o estado salvo e reavaliar os candidatos sem duplicar confirmações ou logs.
- **FR-017**: Os fluxos existentes de confirmação manual, recusa, desistência, convidados e consulta de logs DEVEM continuar disponíveis sob suas regras atuais; esta feature não redefine a preferência entre ações manuais e automáticas além das regras de fila e capacidade já aplicáveis.

### Key Entities *(include if feature involves data)*

- **Jogo**: Lista de participação com capacidade máxima, jogadores associados, confirmados e regras de fila aplicáveis.
- **Jogador do Jogo**: Participante regular ou convidado, com identidade, situação de participação, posição efetiva na fila e elegibilidade vigente.
- **Interesse de Participação**: Intenção ativa de um jogador de obter vaga em um jogo específico; pode aguardar, ser retirada ou ser atendida por confirmação. Não equivale a reserva ou presença confirmada.
- **Vaga Disponível**: Capacidade ainda não ocupada por jogadores confirmados; difere de uma posição liberada na faixa de elegibilidade.
- **Registro de Confirmação**: Evento de histórico que identifica a mudança efetiva de participação e sua origem automática, sem substituir registros anteriores.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos cenários de registro por jogador não elegível ou em jogo cheio, o interesse é aceito sem aumento de confirmados nem redução de vagas.
- **SC-002**: Com ao menos uma lista aberta e online em conexão estável, o primeiro interessado elegível aparece confirmado sem novo clique em até 5 segundos após a disponibilidade da vaga e da elegibilidade; o mesmo prazo vale após carregar o estado atualizado ao abrir ou reconectar a lista.
- **SC-003**: Em 100% dos testes com múltiplos interessados elegíveis e uma vaga, o selecionado é o primeiro pela prioridade vigente, mesmo com ordem inversa de registro de interesse, e todos os demais continuam aguardando.
- **SC-004**: Em 100% dos testes de disputa da última vaga, incluindo duas ou mais listas simultâneas, repetição de eventos e confirmação manual concorrente, o total de confirmados não excede a capacidade e há no máximo uma nova confirmação efetiva.
- **SC-005**: Em 100% das confirmações automáticas efetivas, existe exatamente um registro da respectiva mudança no histórico, identificável como automático; falhas e eventos repetidos não geram registros de sucesso duplicados.
- **SC-006**: Regulares e convidados completam os cenários de espera e confirmação automática com o mesmo resultado para a elegibilidade e prioridade que lhes forem aplicáveis, sem exceções por tipo de participante.
- **SC-007**: Em validação com pelo menos 5 participantes, ao menos 80% distinguem corretamente “interessado/aguardando” de “confirmado” e explicam que registrar interesse não garante vaga, sem orientação adicional.

## Otimização das consultas

- As ações reutilizam um snapshot em memória da fila, preparado ao abrir a lista. Cada transação lê a revisão atual do jogo; somente uma revisão idêntica permite usar o snapshot. Não se usa o estado visual como garantia de vaga.
- Toda alteração em jogadores, interesse ou composição da lista deve incrementar `queueRevision` atomicamente com a gravação. Os fluxos de confirmação manual, automática, convidados e inicialização seguem essa regra. Escritas externas ou clientes antigos que não atualizem a revisão não são compatíveis com esse protocolo.
- Sem alterações remotas, cada ação realiza uma leitura de documento na transação, sem consultar novamente a coleção de jogadores. Após mudanças remotas, a fila é recarregada e a revisão é revalidada antes da gravação.
- O snapshot local só é atualizado após commit bem-sucedido; tentativas abortadas não mudam a fila reutilizada nem geram logs de sucesso.
- Os dados opcionais do dispositivo são preparados uma vez por sessão da aplicação, fora do caminho normal do clique. A coleta mantém prazo limitado e não substitui a validação transacional.
- Ao clicar, a resposta, a cor do card e os contadores são atualizados otimisticamente, sem textos de envio, spinners ou destaque de sincronização. A projeção visual não altera o estado usado pela automação, elegibilidade ou compartilhamento. A transação continua validando prioridade e capacidade no backend; erros removem apenas a projeção da ação, preservam atualizações remotas e permitem nova tentativa, com mensagem no card. Resultados de commits são aplicados sem aguardar outro snapshot, mas não sobrescrevem respostas mais recentes recebidas em tempo real. A modal de interesse só abre após gravação bem-sucedida.
- Validação automatizada: `node --test tests/eligibility.test.cjs tests/device-info.test.cjs tests/game-service.test.cjs`. Os testes de serviço simulam transações otimistas e contabilizam leituras; não substituem a validação com o emulador ou a medição de latência real.

## Assumptions

- **Dependências**: Esta especificação complementa [002 — Apontamento de Participação](../002-apontamento-participacao/spec.md), [003 — Fila de Elegibilidade](../003-fila-elegibilidade/spec.md), [005 — Logs de Check-in](../005-logs-checkin/spec.md) e [006 — Manutenção do Roster](../006-manutencao-roster/spec.md). Não redefine a fila, a admissão de convidados, as permissões nem o versionamento do roster.
- **Prioridade vigente**: A ordem relevante é a ordem efetiva válida para o jogo, incluindo penalidades existentes, não a ordem de cliques nem alterações em versões do roster que não se apliquem àquele jogo. O desempate, quando necessário, permanece o já usado pela fila.
- **Escopo online confirmado**: “Lista aberta” significa ao menos um cliente com a tela daquele jogo em funcionamento e online. Não há garantia de execução com todos os clientes fechados, offline ou suspensos, nem necessidade de manter o dispositivo do interessado aberto.
- **Restrição confirmada pelo usuário**: Não utilizar Firebase Cloud Functions. Trata-se de limite de escopo informado, não de uma proposta de implementação. Execução sem clientes online, notificações e novas rotinas de execução em segundo plano ficam fora desta feature.
- **Ciclo do interesse**: Adota-se a possibilidade de retirada de interesse; a recusa o encerra e a confirmação o atende. Quem desistir depois de confirmado precisa registrar novo interesse para voltar à seleção automática, evitando reconfirmação indesejada.
- **Vagas já existentes**: Abertura ou reconexão da lista, registro de interesse com vaga disponível e avanço da elegibilidade também acionam a seleção; não é necessário esperar uma nova desistência.
- **Múltiplas vagas**: O preenchimento é sucessivo pela prioridade vigente até a capacidade disponível; não se mantém vaga ociosa quando há interessados elegíveis.
- **Meta de experiência**: O prazo de 5 segundos é uma meta de aceitação proposta para conexão estável e cliente em funcionamento, não uma garantia durante indisponibilidade.
- **Governança**: A constituição encontrada no repositório contém apenas placeholders, sem princípios específicos ratificados adicionais a aplicar.
