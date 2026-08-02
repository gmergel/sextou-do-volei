# Contract: RosterService

**Feature**: 006-manutencao-roster | **Date**: 2026-08-02

---

## Overview

Serviço Angular (`@Injectable`) responsável por toda interação com o Firestore para operações de roster: leitura da versão vigente, criação de novas versões, listagem do histórico, e seeding automático.

---

## Public API

### `getCurrentRoster(turmaId: TurmaId): Observable<RosterVersion | null>`

Retorna a versão vigente do roster para a turma. Se nenhuma versão existe, executa seeding e retorna a versão criada.

**Behavior**:
- Lê `turmas/{turmaId}.currentRosterVersion`
- Se campo existe: busca `turmas/{turmaId}/roster-versions/{versionId}`
- Se campo não existe ou subcoleção vazia: executa `seedRoster(turmaId)` e retorna a versão 1
- Emite erro no Observable se Firestore indisponível

**Returns**: `Observable<RosterVersion | null>`

---

### `saveRosterVersion(turmaId: TurmaId, players: RosterPlayer[], deviceInfo: RosterDeviceInfo): Promise<string>`

Salva uma nova versão imutável do roster e atualiza `currentRosterVersion`.

**Behavior**:
- Cria novo documento em `turmas/{turmaId}/roster-versions/` com:
  - `createdAt`: serverTimestamp
  - `deviceInfo`: objeto passado
  - `players`: array ordenado (snapshot completo)
- Atualiza `turmas/{turmaId}.currentRosterVersion` com o novo ID
- Operação atômica via `writeBatch`

**Parameters**:
| Name         | Type               | Description                       |
|--------------|--------------------|-----------------------------------|
| `turmaId`    | `TurmaId`          | ID da turma (`'sextou'` ou `'domingou'`) |
| `players`    | `RosterPlayer[]`   | Array completo ordenado por prioridade   |
| `deviceInfo` | `RosterDeviceInfo` | Device info capturado automaticamente    |

**Returns**: `Promise<string>` — ID da nova versão criada

**Errors**: Rejeita promise se write falha (Firestore indisponível)

---

### `getRosterHistory(turmaId: TurmaId, pageSize?: number, startAfterDoc?: DocumentSnapshot): Promise<RosterHistoryPage>`

Retorna página do histórico de versões em ordem cronológica reversa.

**Behavior**:
- Query: `orderBy('createdAt', 'desc')`, `limit(pageSize)`, opcionalmente `startAfter(startAfterDoc)`
- Retorna array de versões + flag `hasMore` + último documento para paginação

**Parameters**:
| Name            | Type                | Default | Description                              |
|-----------------|---------------------|---------|------------------------------------------|
| `turmaId`       | `TurmaId`           | —       | ID da turma                              |
| `pageSize`      | `number`            | `20`    | Quantidade de versões por página         |
| `startAfterDoc` | `DocumentSnapshot?` | `null`  | Cursor para paginação (última doc anterior) |

**Returns**: `Promise<RosterHistoryPage>`

```typescript
interface RosterHistoryPage {
  versions: RosterVersion[];
  hasMore: boolean;
  lastDoc: DocumentSnapshot | null;
}
```

---

### `seedRoster(turmaId: TurmaId): Promise<string>`

Cria a versão 1 do roster a partir dos dados hardcoded. Só executa se nenhuma versão existe.

**Behavior**:
- Verifica se subcoleção `roster-versions` está vazia
- Se vazia: mapeia `TURMAS[turmaId].defaultPlayers` para `RosterPlayer[]` (com `active: true`, IDs como string)
- Cria documento com `deviceInfo: { source: "Sistema" }` e `note: "Versão inicial (migração automática)"`
- Atualiza `currentRosterVersion`
- Se NÃO vazia: no-op, retorna ID da versão vigente

**Returns**: `Promise<string>` — ID da versão (criada ou existente)

---

## Signal-Based State (Component-Level)

O `RosterEditorComponent` expõe signals para estado reativo:

```typescript
// Signals de estado
readonly currentVersion = signal<RosterVersion | null>(null);
readonly editingPlayers = signal<RosterPlayer[]>([]);
readonly isEditing = signal(false);
readonly isSaving = signal(false);
readonly hasUnsavedChanges = computed(() => /* diff editingPlayers vs currentVersion */);

// Signals computados
readonly activePlayers = computed(() => 
  this.editingPlayers().filter(p => p.active)
);
readonly inactivePlayers = computed(() => 
  this.editingPlayers().filter(p => !p.active)
);
readonly activeCount = computed(() => this.activePlayers().length);
readonly canCreateGame = computed(() => 
  this.activeCount() >= this.totalPlayers
);
```

---

## Error Handling

| Scenario                        | Behavior                                           |
|---------------------------------|----------------------------------------------------|
| Firestore indisponível (read)   | Emite erro no Observable; componente bloqueia UI   |
| Firestore indisponível (write)  | Promise rejeitada; exibe toast/snackbar de erro    |
| Seeding race condition          | Check-then-act com retry (idempotente)             |
| Concurrent saves (last-write)   | Ambas versões persistem; último atualiza `current` |

---

## Integration Points

| Consumer                        | Contrato                                                   |
|---------------------------------|------------------------------------------------------------|
| `CreateGameComponent`           | Chama `getCurrentRoster()` ao selecionar turma             |
| `CreateGameComponent`           | Usa `currentVersion.id` como `rosterVersionId` na criação  |
| `GameService.createGame()`      | Recebe `rosterVersionId` e persiste no documento do game   |
| Spec 003 (Fila de Elegibilidade)| Lê `games/{id}.rosterVersionId` → busca versão do roster   |
