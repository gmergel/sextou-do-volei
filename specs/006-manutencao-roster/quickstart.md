# Quickstart: Validação da Feature — Manutenção do Roster

**Feature**: 006-manutencao-roster | **Date**: 2026-08-02

---

## Prerequisites

- Node.js 18+ instalado
- Firebase CLI instalado (`npm install -g firebase-tools`)
- Projeto Angular rodando localmente (`npm.cmd start` ou `ng serve`)
- Firebase Emulator Suite (Firestore) ou projeto Firebase configurado
- Browser moderno (Chrome/Edge para Client Hints)

---

## Setup

```bash
# 1. Instalar dependências (se ainda não)
npm.cmd install

# 2. Garantir que @angular/cdk está instalado (para drag & drop)
npm.cmd install @angular/cdk

# 3. Iniciar app em desenvolvimento
npm.cmd start
```

---

## Cenários de Validação

### Cenário 1: Seeding Automático (primeira execução)

**Objetivo**: Validar que o roster é criado automaticamente na primeira vez.

1. Limpar dados do Firestore (se necessário): deletar subcoleção `turmas/sextou/roster-versions`
2. Acessar `http://localhost:4200/jogo/novo`
3. Selecionar turma "Sextou"

**Expected**:
- Preview do roster aparece: "23 jogadores ativos | Versão de [data atual]"
- Lista de nomes ordenada por prioridade (Dani Griza, Ger, Carlos Serafim, Raquel, ...)
- No Firestore: documento criado em `turmas/sextou/roster-versions/` com `deviceInfo.source: "Sistema"`

---

### Cenário 2: Visualização do Roster (preview)

**Objetivo**: Validar que o preview mostra dados corretos.

1. Acessar `http://localhost:4200/jogo/novo`
2. Selecionar turma "Sextou" (com roster já existente)

**Expected**:
- Resumo: "{N} jogadores ativos | Versão de DD/MM/AAAA"
- Lista de nomes visível em ordem de prioridade
- Botão "Editar lista" visível

---

### Cenário 3: Edição com Drag & Drop

**Objetivo**: Validar reordenação via arrastar/soltar.

1. Clicar "Editar lista" para expandir painel
2. Verificar que formulário de criação fica desabilitado (visual esmaecido)
3. Arrastar jogador da posição 3 para posição 7
4. Verificar que a ordem visual reflete a mudança

**Expected**:
- Painel de edição expandido
- Formulário de criação visível mas não interativo
- Jogador na nova posição após drop
- Indicação visual de "alterações não salvas"

---

### Cenário 4: Adicionar e Remover Jogadores

**Objetivo**: Validar operações de adição/remoção.

1. No modo de edição, digitar "Paulo" no campo de novo jogador e confirmar
2. Verificar que "Paulo" aparece ao final da lista
3. Clicar "Remover" em um jogador existente
4. Verificar que ele aparece na seção "Inativos"

**Expected**:
- "Paulo" na última posição com status ativo
- Jogador removido na seção "Inativos" com opção "Reativar"
- Validação impede nomes < 2 chars ou duplicados

---

### Cenário 5: Salvar Nova Versão

**Objetivo**: Validar criação de versão imutável.

1. Fazer alterações (mover jogador, adicionar "Paulo")
2. Clicar "Salvar alterações"
3. Verificar no Firestore que nova versão foi criada

**Expected**:
- Novo documento em `turmas/sextou/roster-versions/` com:
  - `createdAt`: timestamp atual
  - `deviceInfo`: user-agent e dados do dispositivo
  - `players`: array completo atualizado
- `turmas/sextou.currentRosterVersion` atualizado para novo ID
- Preview atualiza com nova data e contagem

---

### Cenário 6: Vinculação ao Jogo

**Objetivo**: Validar que o jogo referencia a versão correta.

1. Após salvar alterações no roster, criar um novo jogo normalmente
2. Verificar documento do jogo no Firestore

**Expected**:
- Documento do game contém campo `rosterVersionId` com ID da versão vigente
- Editar roster novamente e criar outro jogo → novo jogo usa nova versão
- Jogo anterior mantém referência à versão antiga

---

### Cenário 7: Validação de Mínimo de Jogadores

**Objetivo**: Validar bloqueio de criação com roster insuficiente.

1. No modo de edição, desativar jogadores até ficar com < 14 ativos
2. Salvar alterações
3. Tentar criar jogo com `totalPlayers: 14`

**Expected**:
- Criação bloqueada
- Mensagem: "A lista precisa ter pelo menos 14 jogadores ativos para criar um jogo com 14 vagas. Atualmente há {N} jogadores ativos."

---

### Cenário 8: Histórico de Versões

**Objetivo**: Validar visualização do histórico com diffs.

1. Criar pelo menos 2 versões do roster (seeding + 1 edição manual)
2. Clicar "Ver histórico"

**Expected**:
- Lista de versões em ordem cronológica reversa
- Cada entrada mostra: data/hora, device info, diff visual
- Diff: jogadores adicionados (verde), removidos (vermelho), movidos (indicação de posição)
- Versão 1 (seeding): nota "Versão inicial (migração automática)", todos marcados como adicionados

---

### Cenário 9: Proteção contra Alterações Não Salvas

**Objetivo**: Validar aviso ao descartar edições.

1. Fazer alterações no modo de edição (sem salvar)
2. Tentar colapsar o painel de edição

**Expected**:
- Diálogo de confirmação: "Deseja descartar as alterações?"
- Confirmar: descarta e colapsa
- Cancelar: mantém painel aberto com alterações

---

## Troubleshooting

| Problema                              | Solução                                                    |
|---------------------------------------|------------------------------------------------------------|
| Roster não carrega                    | Verificar config Firebase em `environments/environment.ts` |
| Drag & drop não funciona              | Verificar import de `DragDropModule` do CDK                |
| Seeding não executa                   | Verificar se subcoleção `roster-versions` está realmente vazia |
| Device info incompleto                | Testar em Chrome/Edge (Client Hints não suportado em todos browsers) |
| Erro "Permission denied" no Firestore | Verificar regras em `firestore.rules`                      |
