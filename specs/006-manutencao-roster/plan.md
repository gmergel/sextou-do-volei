# Implementation Plan: Manutenção da Lista de Jogadores com Versionamento

**Branch**: `006-manutencao-roster` | **Date**: 2026-08-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-manutencao-roster/spec.md`

## Summary

Sistema de edição, versionamento e persistência da lista de jogadores (roster) de cada turma, integrado à tela de criação de jogo como painel expansível. Permite reordenação de prioridade via drag & drop/setas, adição/remoção de jogadores, histórico completo de alterações com device telemetry, e vinculação imutável de versão do roster a cada jogo criado.

## Technical Context

**Language/Version**: TypeScript 5.x / Angular 19

**Primary Dependencies**: Angular 19 (standalone components, signals), Angular Material + CDK (drag & drop), Firebase/Firestore (@angular/fire)

**Storage**: Firebase Firestore — coleção `turmas/{turmaId}/roster-versions/{versionId}` + campo `currentRosterVersion` no documento da turma

**Testing**: Jasmine/Karma (unit), manual E2E

**Target Platform**: Web (PWA-ready) — mobile-first responsive

**Project Type**: Web application (SPA Angular)

**Performance Goals**: Operações de edição simples (mover 1-2 jogadores) < 2 minutos; salvamento < 2s

**Constraints**: Sem autenticação — identificação por device info; offline-blocking (Firestore indisponível bloqueia criação); last-write-wins para concorrência

**Scale/Scope**: ~2 turmas, ~25 jogadores cada, dezenas de versões ao longo do tempo

## Constitution Check

*Constituição não definida (template vazio) — nenhum gate aplicável.*

## Project Structure

### Documentation (this feature)

```text
specs/006-manutencao-roster/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── roster-service.contract.md
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/app/
├── models/
│   ├── game.model.ts          # (existente) — adicionar rosterVersionId ao Game
│   ├── turma.model.ts         # (existente) — adicionar currentRosterVersion
│   └── roster.model.ts        # (novo) — RosterVersion, RosterPlayer interfaces
├── features/
│   ├── create-game/
│   │   ├── create-game.component.ts    # (existente) — integrar roster preview + painel edição
│   │   ├── create-game.component.html  # (existente) — template com painel expansível
│   │   └── create-game.component.scss  # (existente) — estilos painel
│   └── roster/                         # (novo) — feature module do roster
│       ├── roster-preview.component.ts      # Preview compacto (nomes + resumo)
│       ├── roster-preview.component.html
│       ├── roster-editor.component.ts       # Painel de edição (drag & drop, add/remove)
│       ├── roster-editor.component.html
│       ├── roster-editor.component.scss
│       ├── roster-history.component.ts      # Histórico de versões com diff
│       ├── roster-history.component.html
│       ├── roster-history.component.scss
│       ├── roster.service.ts                # CRUD roster versions no Firestore
│       └── roster-diff.util.ts             # Utility para calcular diffs entre versões
└── services/ (ou dentro de features/roster/)
```
