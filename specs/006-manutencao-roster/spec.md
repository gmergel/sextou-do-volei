# Feature Specification: Manutenção da Lista de Jogadores com Versionamento

**Feature Branch**: `006-manutencao-roster`

**Created**: 2026-08-02

**Status**: Draft

**Input**: Sistema de edição, versionamento e persistência da lista de jogadores (roster) de cada turma, integrado à tela de criação de jogo, permitindo reordenação de prioridade, adição/remoção de jogadores e histórico completo de alterações.

## Clarifications

### Session 2026-08-02

- Q: Fluxo UX do modo de edição? → A: Painel expansível/colapsável na mesma tela. Formulário de criação fica visível mas desabilitado durante edição.
- Q: Identificador estável de jogador? → A: Sim, cada jogador recebe ID estável (UUID curto ou auto-increment) gerado na criação, persistido em todas as versões para diffs corretos.
- Q: UX do diálogo de salvamento? → A: Sem modal/dialog. Sistema captura automaticamente user-agent e device info (mesmo mecanismo dos logs de audit/checkin). Sem campo de nome ou descrição.
- Q: Limite de versões no histórico? → A: Últimas 20 versões exibidas, com botão "Carregar mais" para anteriores.
- Q: Comportamento quando Firestore indisponível ao carregar roster? → A: Bloquear criação. Exibir erro e impedir criação do jogo até o roster carregar com sucesso.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visualização do Roster na Criação de Jogo (Priority: P1)

Como organizador, ao abrir a tela de criação de jogo e selecionar uma turma, quero ver um preview da lista atual de jogadores (nomes na ordem de prioridade) com informações resumidas (quantidade de ativos e data da versão vigente), para ter contexto antes de prosseguir.

**Why this priority**: É o ponto de entrada para toda a funcionalidade — sem a visualização do roster, o organizador não consegue avaliar se precisa editar a lista antes de criar o jogo.

**Independent Test**: Pode ser testado selecionando uma turma na tela de novo jogo e verificando que a lista de jogadores aparece corretamente ordenada com o resumo "N jogadores ativos | Versão de DD/MM/AAAA".

**Acceptance Scenarios**:

1. **Given** um organizador na tela "Novo Jogo" com a turma "Sextou" selecionada e uma versão vigente do roster com 23 jogadores ativos, **When** a tela carrega, **Then** ele vê o preview "23 jogadores ativos | Versão de 01/08/2026" e a lista de nomes ordenada por prioridade
2. **Given** um organizador na tela "Novo Jogo" com a turma "Domingou" selecionada e roster com 3 jogadores inativos, **When** a tela carrega, **Then** o preview mostra apenas a contagem de jogadores ativos (exclui inativos) e jogadores inativos não aparecem na lista principal
3. **Given** um organizador na tela "Novo Jogo" e nenhuma versão do roster existe para a turma selecionada, **When** a tela carrega, **Then** o sistema realiza seeding automático a partir dos dados hardcoded, cria a versão 1 e exibe o preview normalmente

---

### User Story 2 - Edição Inline do Roster com Reordenação (Priority: P1)

Como organizador, quero poder editar a lista de jogadores diretamente na tela de criação de jogo (modo de edição em painel expansível) com capacidade de reordenar jogadores por drag & drop ou setas, para ajustar as prioridades conforme necessário.

**UX do Modo de Edição**: O modo de edição é um painel expansível/colapsável na mesma tela de criação de jogo. Ao abrir, o formulário de criação do jogo permanece visível mas desabilitado (non-interactive) enquanto o roster está sendo editado. Ao salvar ou cancelar a edição, o formulário volta ao estado normal (interativo).

**Why this priority**: A reordenação é a operação mais frequente e crítica — define quem confirma presença primeiro. Sem ela, o roster não pode ser gerenciado de forma prática.

**Independent Test**: Pode ser testado abrindo o modo de edição, arrastando um jogador para uma nova posição e verificando que a ordem visual reflete a mudança antes de salvar.

**Acceptance Scenarios**:

1. **Given** o organizador com o modo de edição aberto mostrando a lista de jogadores, **When** ele arrasta "Carlos" da posição 3 para a posição 7, **Then** "Carlos" aparece na posição 7 e todos os jogadores entre 4-7 sobem uma posição
2. **Given** o organizador com o modo de edição aberto, **When** ele clica na seta "para baixo" no jogador da posição 1, **Then** o jogador move para posição 2 e o que estava na posição 2 sobe para posição 1
3. **Given** o organizador com o modo de edição aberto e "Carlos" na última posição, **When** ele clica na seta "para baixo", **Then** nada acontece (já está na última posição)
4. **Given** o organizador com alterações não salvas no modo de edição, **When** ele tenta fechar/colapsar o painel de edição ou navegar para outra página, **Then** um aviso de confirmação é exibido perguntando se deseja descartar as alterações
5. **Given** o organizador com o painel de edição aberto, **When** ele visualiza a tela, **Then** o formulário de criação de jogo está visível porém desabilitado (campos não clicáveis, aparência esmaecida)

---

### User Story 3 - Adição e Remoção de Jogadores (Priority: P1)

Como organizador, quero poder adicionar novos jogadores ao final da lista e remover (desativar) jogadores existentes, para manter o roster atualizado com quem realmente participa da turma.

**Why this priority**: Jogadores entram e saem das turmas regularmente — sem adição/remoção, a lista ficaria desatualizada rapidamente.

**Independent Test**: Pode ser testado adicionando um novo jogador com nome válido e verificando que ele aparece ao final da lista, e desativando um jogador e verificando que ele não conta como ativo.

**Acceptance Scenarios**:

1. **Given** o modo de edição aberto com 23 jogadores ativos, **When** o organizador digita "Paulo" no campo de novo jogador e confirma, **Then** "Paulo" aparece na posição 24 (final da lista) com status ativo
2. **Given** o modo de edição aberto, **When** o organizador tenta adicionar um jogador com nome "A" (1 caractere), **Then** uma mensagem de validação informa que o nome deve ter pelo menos 2 caracteres
3. **Given** o modo de edição aberto com "João" já na lista, **When** o organizador tenta adicionar outro "João", **Then** uma mensagem de validação informa que já existe um jogador com esse nome na turma
4. **Given** o modo de edição aberto, **When** o organizador clica em "Remover" no jogador "Maria", **Then** "Maria" é marcada como inativa (soft delete) — ela aparece em seção separada de "Inativos" e não conta na lista de ativos
5. **Given** o modo de edição aberto com o jogador "Maria" inativo, **When** o organizador clica em "Reativar", **Then** "Maria" volta para a lista de ativos na última posição
6. **Given** o modo de edição aberto, **When** o organizador edita o nome de "Carlos" para "Carlos H.", **Then** o nome é atualizado na lista mantendo a mesma posição

---

### User Story 4 - Salvamento com Criação de Nova Versão (Priority: P1)

Como organizador, após fazer alterações no roster, quero salvar as mudanças e ter uma nova versão imutável criada automaticamente, para que o histórico seja preservado e o jogo use a versão correta.

**Why this priority**: O versionamento é o mecanismo central que garante rastreabilidade e integridade — sem ele, alterações no roster afetariam jogos existentes.

**Fluxo de Salvamento**: Ao clicar "Salvar alterações", o sistema salva imediatamente sem diálogo intermediário. A identificação do editor é capturada automaticamente via user-agent e informações do device (mesmo mecanismo usado nos logs de audit/checkin do app). Não há campo de nome nem descrição — apenas device info de quem fez a alteração.

**Independent Test**: Pode ser testado fazendo alterações no roster, clicando em salvar e verificando que um novo documento de versão foi criado no Firestore com snapshot completo da lista e device info capturado automaticamente.

**Acceptance Scenarios**:

1. **Given** o organizador com alterações pendentes (moveu "Carlos", adicionou "Paulo"), **When** ele clica "Salvar alterações", **Then** uma nova versão é criada em `turmas/{turmaId}/roster-versions/{novoId}` com o snapshot completo, device info capturado automaticamente, e `currentRosterVersion` é atualizado no documento da turma
2. **Given** o organizador salvando alterações, **When** ele clica "Salvar alterações", **Then** o salvamento ocorre imediatamente sem diálogo intermediário (sem modal, sem campos de nome ou descrição)
3. **Given** uma nova versão salva com sucesso, **When** o preview do roster atualiza, **Then** mostra a nova contagem de ativos e a data da versão recém-criada
4. **Given** o organizador na tela de criação de jogo com a versão do roster recém-atualizada, **When** ele completa a criação do jogo, **Then** o documento do game inclui o campo `rosterVersionId` apontando para a versão mais recente
5. **Given** o organizador salvando alterações, **When** a versão é criada, **Then** o campo `deviceInfo` contém user-agent e informações do dispositivo capturados automaticamente

---

### User Story 5 - Histórico de Versões do Roster (Priority: P2)

Como organizador, quero consultar o histórico de versões do roster para saber quem alterou a lista, quando e o que mudou, promovendo transparência nas decisões.

**Why this priority**: O histórico garante transparência e accountability — importante para a dinâmica social do grupo, mas o sistema funciona sem ele.

**Paginação do Histórico**: O histórico exibe as últimas 20 versões por padrão, com botão "Carregar mais" caso existam versões anteriores.

**Independent Test**: Pode ser testado clicando em "Ver histórico" e verificando que a lista de versões aparece em ordem cronológica reversa com data, device info e diff visual.

**Acceptance Scenarios**:

1. **Given** o organizador com o modo de edição aberto e 5 versões existentes, **When** ele clica "Ver histórico", **Then** uma lista com 5 entradas aparece em ordem cronológica reversa (mais recente primeiro)
2. **Given** o histórico de versões exibido, **When** o organizador visualiza uma entrada, **Then** ele vê: data/hora da criação, device info de quem editou, e diff visual (jogadores adicionados em verde, removidos em vermelho, movidos com indicação de posição anterior/nova — baseado em IDs estáveis dos jogadores)
3. **Given** o histórico de versões exibido, **When** o organizador visualiza a versão 1 (seeding), **Then** a nota mostra "Versão inicial (migração automática)" e o diff mostra todos os jogadores como adicionados
4. **Given** o histórico com mais de 20 versões, **When** o organizador visualiza o histórico, **Then** apenas as últimas 20 versões são exibidas com botão "Carregar mais" ao final
5. **Given** o histórico exibindo 20 versões e existindo mais, **When** o organizador clica "Carregar mais", **Then** as próximas 20 versões são carregadas e adicionadas à lista

---

### User Story 6 - Identificação do Editor via Device Telemetry (Priority: P2)

Como membro da turma, quero saber qual dispositivo fez cada alteração no roster para que haja rastreabilidade sobre as mudanças, utilizando captura automática de device info (sem campo manual de nome).

**Why this priority**: Complementa o histórico com a dimensão de "quem" — importante para transparência social mas não bloqueia funcionalidades core.

**Mecanismo de Identificação**: O sistema captura automaticamente user-agent e informações do dispositivo no momento do salvamento (mesmo mecanismo já utilizado nos logs de audit/checkin do app). Não há campo manual de nome — a identificação é por device info.

**Independent Test**: Pode ser testado salvando uma versão e verificando que o campo `deviceInfo` é persistido automaticamente na versão com user-agent e dados do dispositivo.

**Acceptance Scenarios**:

1. **Given** o organizador salvando alterações no roster, **When** ele clica "Salvar alterações", **Then** o sistema captura automaticamente o user-agent e device info sem solicitar nenhum campo manual
2. **Given** o organizador salvando alterações de um celular Android, **When** a versão é criada, **Then** o campo `deviceInfo` contém informações como modelo do dispositivo, sistema operacional e navegador
3. **Given** o organizador salvando alterações de um desktop, **When** a versão é criada, **Then** o campo `deviceInfo` contém informações de browser e OS

---

### User Story 7 - Vinculação de Versão ao Jogo Criado (Priority: P1)

Como sistema, ao criar um jogo, devo vincular permanentemente a versão do roster vigente naquele momento ao jogo, para que alterações futuras no roster não afetem jogos já criados.

**Why this priority**: Garantia de integridade de dados — se jogos existentes fossem afetados por mudanças no roster, o sistema de fila de elegibilidade quebraria.

**Independent Test**: Pode ser testado criando um jogo, alterando o roster depois, e verificando que o jogo continua usando a versão original.

**Acceptance Scenarios**:

1. **Given** a turma "Sextou" com `currentRosterVersion` apontando para versão "v5", **When** o organizador cria um novo jogo, **Then** o documento do jogo inclui `rosterVersionId: "v5"`
2. **Given** um jogo criado com `rosterVersionId: "v5"` e o roster atualizado para versão "v6", **When** o sistema carrega os jogadores do jogo existente, **Then** os jogadores e prioridades são lidos de "v5" (não "v6")
3. **Given** um jogo em andamento (criado mas não finalizado) e o roster sendo editado, **When** a nova versão do roster é salva, **Then** o jogo em andamento não é afetado de nenhuma forma

---

### User Story 8 - Seeding Automático na Primeira Execução (Priority: P1)

Como sistema, na primeira vez que o roster é acessado e não existe nenhuma versão no Firestore, devo criar automaticamente a versão 1 a partir dos dados hardcoded atuais, para garantir continuidade sem intervenção manual.

**Why this priority**: Sem o seeding, a migração dos dados existentes para o novo modelo seria um bloqueio total — nenhuma funcionalidade do roster funcionaria na primeira execução.

**Independent Test**: Pode ser testado acessando a tela de criação de jogo com uma turma que não possui versões de roster no Firestore e verificando que a versão 1 é criada automaticamente.

**Acceptance Scenarios**:

1. **Given** a turma "Sextou" sem nenhum documento em `turmas/sextou/roster-versions/`, **When** o organizador acessa a tela de criação de jogo e seleciona "Sextou", **Then** o sistema cria a versão 1 com os jogadores hardcoded na ordem original e define `currentRosterVersion` para essa versão
2. **Given** o seeding automático executado com sucesso, **When** a versão 1 é criada, **Then** ela contém `deviceInfo: { source: "Sistema" }`, nota "Versão inicial (migração automática)" e o array `players` com todos os jogadores hardcoded com `active: true` e IDs estáveis gerados
3. **Given** a turma "Sextou" já com versões existentes no Firestore, **When** o organizador acessa a tela de criação de jogo, **Then** o seeding NÃO é executado e a versão vigente é carregada normalmente

---

### User Story 9 - Validação de Mínimo de Jogadores Ativos (Priority: P2)

Como sistema, devo impedir a criação de um jogo quando o número de jogadores ativos no roster é menor que `totalPlayers` (vagas do jogo), para evitar situações onde não há jogadores suficientes.

**Why this priority**: Previne criação de jogos impossíveis de preencher — proteção contra erro operacional, mas depende da edição de roster já funcionar.

**Independent Test**: Pode ser testado desativando jogadores até ficar abaixo do `totalPlayers` e tentando criar o jogo, verificando que a criação é bloqueada com mensagem clara.

**Acceptance Scenarios**:

1. **Given** um roster com 12 jogadores ativos e o organizador configurando um jogo com `totalPlayers: 14`, **When** ele tenta criar o jogo, **Then** a criação é bloqueada com mensagem "A lista precisa ter pelo menos 14 jogadores ativos para criar um jogo com 14 vagas. Atualmente há 12 jogadores ativos."
2. **Given** um roster com 14 jogadores ativos e o organizador configurando um jogo com `totalPlayers: 14`, **When** ele tenta criar o jogo, **Then** a criação é permitida normalmente
3. **Given** o modo de edição aberto e o organizador desativando jogadores, **When** o número de ativos fica abaixo de `totalPlayers` configurado, **Then** um aviso visual é exibido (mas não bloqueia a edição — apenas a criação do jogo será bloqueada)

---

### Edge Cases

- O que acontece se dois organizadores editam o roster simultaneamente? → Last-write-wins: o último a salvar cria a versão mais recente, mas ambas as versões ficam no histórico. A versão "perdida" não é sobrescrita, ela existe como versão intermediária no histórico.
- O que acontece se a lista é editada com um jogo em andamento (criado mas não finalizado)? → Nada: jogos existentes não são afetados, pois cada jogo referencia sua própria `rosterVersionId` fixa.
- O que acontece se removem jogadores deixando menos ativos que `totalPlayers`? → A edição é salva normalmente, mas a criação de novos jogos é bloqueada com mensagem de erro clara até que o roster tenha jogadores ativos suficientes.
- O que acontece na primeira execução quando não existe nenhuma versão? → Seeding automático: o sistema cria a versão 1 a partir dos dados hardcoded do código, com `createdBy: "Sistema"`.
- O que acontece se o organizador cancela a edição sem salvar? → Nenhuma versão é criada; o roster permanece na versão vigente anterior.
- O que acontece se o Firestore está indisponível durante o salvamento? → O erro é exibido ao usuário e nenhuma versão é criada; o organizador pode tentar novamente.
- O que acontece se o Firestore está indisponível ao carregar o roster (antes da criação do jogo)? → A criação do jogo é bloqueada. O sistema exibe mensagem de erro e impede a criação do jogo até que o roster carregue com sucesso.
- O que acontece se a validação de nome duplicado é case-sensitive? → A validação ignora maiúsculas/minúsculas (case-insensitive): "João" e "joão" são considerados o mesmo nome.
- O que acontece se o campo `initial` do jogador precisa ser derivado automaticamente? → O campo `initial` é a primeira letra do nome do jogador (maiúscula), gerado automaticamente ao adicionar/renomear.
- O que acontece se um jogador inativo é reativado — qual posição ele recebe? → Ele volta na última posição da lista de ativos (final da fila de prioridade).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE exibir um preview do roster (nomes ordenados por prioridade) na tela de criação de jogo ao selecionar uma turma
- **FR-002**: O sistema DEVE exibir informações resumidas no preview: quantidade de jogadores ativos e data da versão vigente
- **FR-003**: O sistema DEVE oferecer um botão "Editar lista" que expande um painel de edição na mesma tela de criação de jogo (painel expansível/colapsável)
- **FR-003a**: Ao abrir o painel de edição, o formulário de criação do jogo DEVE permanecer visível mas desabilitado (non-interactive) até o salvamento ou cancelamento da edição
- **FR-004**: O modo de edição DEVE permitir reordenar jogadores via drag & drop
- **FR-005**: O modo de edição DEVE permitir reordenar jogadores via setas (cima/baixo) como alternativa ao drag & drop
- **FR-006**: O modo de edição DEVE permitir adicionar novo jogador ao final da lista de ativos
- **FR-007**: O modo de edição DEVE permitir editar o nome de um jogador existente
- **FR-008**: O modo de edição DEVE permitir remover (soft delete) um jogador, marcando-o como inativo
- **FR-009**: O modo de edição DEVE permitir reativar um jogador inativo, posicionando-o ao final da lista de ativos
- **FR-010**: O sistema DEVE validar que nomes de jogadores tenham pelo menos 2 caracteres
- **FR-011**: O sistema DEVE validar que não existam nomes duplicados na mesma turma (comparação case-insensitive)
- **FR-012**: O sistema DEVE gerar automaticamente o campo `initial` como a primeira letra maiúscula do nome do jogador
- **FR-013**: Ao salvar alterações, o sistema DEVE criar um novo documento imutável em `turmas/{turmaId}/roster-versions/{versionId}` com snapshot completo do roster
- **FR-014**: O snapshot da versão DEVE conter: `createdAt` (timestamp), `deviceInfo` (objeto com user-agent e dados do dispositivo), `players` (array ordenado de {id, name, initial, active})
- **FR-015**: Ao salvar alterações, o sistema DEVE atualizar o campo `currentRosterVersion` no documento da turma para apontar para a nova versão
- **FR-016**: O sistema DEVE capturar automaticamente user-agent e device info ao salvar uma versão (sem campo manual de nome ou descrição)
- **FR-017**: O salvamento DEVE ocorrer imediatamente ao clicar "Salvar alterações", sem diálogo intermediário (sem modal)
- **FR-018**: Ao criar um jogo, o sistema DEVE gravar o campo `rosterVersionId` no documento do game, vinculando-o permanentemente à versão vigente do roster naquele momento
- **FR-019**: Jogos já criados DEVEM continuar usando a versão do roster com que foram criados, independente de alterações posteriores
- **FR-020**: O sistema DEVE impedir a criação de um jogo quando o número de jogadores ativos é menor que `totalPlayers`, exibindo mensagem de erro clara
- **FR-021**: O sistema DEVE realizar seeding automático (criação da versão 1 a partir de dados hardcoded) quando nenhuma versão do roster existe para a turma
- **FR-022**: O seeding DEVE criar a versão com `deviceInfo: { source: "Sistema" }` e nota interna "Versão inicial (migração automática)"
- **FR-023**: O sistema DEVE oferecer funcionalidade "Ver histórico" que exibe as últimas 20 versões em ordem cronológica reversa, com botão "Carregar mais" para versões anteriores
- **FR-024**: Cada entrada do histórico DEVE mostrar: data/hora, device info de quem editou, e diff visual (adições, remoções, mudanças de posição — baseado em IDs estáveis dos jogadores)
- **FR-025**: O sistema DEVE exibir aviso de confirmação quando o organizador tenta colapsar o painel de edição ou navegar para outra página com alterações não salvas
- **FR-026**: A ordem dos jogadores no array `players` da versão DEVE definir a prioridade (index 0 = prioridade 1)
- **FR-027**: Jogadores com `active: false` NÃO DEVEM ser incluídos na criação de novos jogos nem na fila de elegibilidade
- **FR-028**: O campo `rosterVersionId` do jogo DEVE ser usado pela spec 003 (Fila de Elegibilidade) para determinar as prioridades dos jogadores
- **FR-029**: Jogadores inativos DEVEM ser exibidos em seção separada no modo de edição, com opção de reativação
- **FR-030**: Em caso de edição simultânea, o sistema DEVE adotar política last-write-wins, preservando ambas as versões no histórico
- **FR-031**: Cada jogador DEVE possuir um ID estável (UUID curto ou auto-increment) gerado na criação, persistido em todas as versões do roster, permitindo diffs corretos no histórico (distinguir renomear de remover+adicionar)
- **FR-032**: O sistema DEVE bloquear a criação de jogo e exibir mensagem de erro quando o Firestore está indisponível e o roster não pode ser carregado
- **FR-033**: O histórico DEVE paginar com máximo de 20 versões por página, com botão "Carregar mais" para versões anteriores

### Key Entities

- **Turma**: Documento em `turmas/{turmaId}` — representa um grupo de jogadores (Sextou/Domingou). Contém o campo `currentRosterVersion` que aponta para a versão ativa do roster.
- **Versão do Roster**: Documento imutável em `turmas/{turmaId}/roster-versions/{versionId}` — snapshot completo da lista de jogadores em um determinado momento. Campos: `createdAt`, `deviceInfo` (user-agent e dados do dispositivo de quem editou), `players` (array ordenado de objetos com id estável).
- **Jogador (no roster)**: Objeto dentro do array `players` da versão — representa um membro da turma. Campos: `id` (string, UUID curto ou auto-increment, estável entre versões), `name` (string, ≥2 chars), `initial` (string, primeira letra maiúscula), `active` (boolean). O ID estável permite gerar diffs corretos no histórico (distinguir renomear de remover+adicionar).
- **Jogo (Game)**: Documento que referencia uma versão específica do roster via campo `rosterVersionId`, garantindo que a lista de jogadores usada é imutável para aquele jogo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Organizadores conseguem visualizar, editar e salvar o roster em menos de 2 minutos para operações simples (mover 1-2 jogadores)
- **SC-002**: 100% dos jogos criados após a feature possuem campo `rosterVersionId` vinculado a uma versão válida do roster
- **SC-003**: Alterações no roster nunca afetam jogos existentes — verificável comparando a lista de jogadores de um jogo antes e depois de uma edição do roster
- **SC-004**: O histórico de versões permite identificar o dispositivo que fez cada alteração e quando, com 100% de rastreabilidade via device info automático
- **SC-005**: O seeding automático ocorre de forma transparente na primeira execução, sem intervenção manual do organizador
- **SC-006**: A validação de mínimo de jogadores ativos impede 100% das tentativas de criação de jogos com roster insuficiente
- **SC-007**: Nenhum dado é perdido em edições simultâneas — ambas as versões são preservadas no histórico
- **SC-008**: Organizadores percebem a edição do roster como intuitiva e rápida, com drag & drop funcionando sem erros visuais

## Assumptions

- Os dados hardcoded dos jogadores existentes no código-fonte atual serão a fonte para o seeding automático da versão 1
- O campo `initial` é derivado automaticamente do nome (primeira letra maiúscula) e não é editável diretamente
- Não existe sistema de autenticação — a identificação do editor é por device info capturado automaticamente (mesmo mecanismo dos logs de audit/checkin)
- O conflito de edição simultânea é raro dado o tamanho pequeno dos grupos e será resolvido por last-write-wins
- O Firestore suporta o volume de dados esperado (poucas dezenas de versões por turma ao longo do tempo)
- A interface de drag & drop utiliza interações padrão de dispositivos móveis (touch) e desktop (mouse)
- O campo `totalPlayers` já existe no modelo de jogo (definido na spec 001)
- A integração com a spec 003 (Fila de Elegibilidade) usa a posição no array `players` como prioridade (index + 1)
- O organizador pode optar por não editar o roster — nesse caso, o jogo é criado com a versão vigente sem qualquer intervenção
- A funcionalidade de histórico não permite reverter para versões anteriores — apenas consulta (para reverter, o organizador deve recriar manualmente a configuração desejada)
