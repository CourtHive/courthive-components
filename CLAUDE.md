# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mentat Orchestration (READ FIRST)

Before doing anything else, read `../Mentat/CLAUDE.md`, `../Mentat/TASKS.md`, `../Mentat/standards/coding-standards.md`, and every file in `../Mentat/in-flight/`. Mentat is the orchestration layer for the entire CourtHive ecosystem; its standards override per-repo conventions when they conflict. If you are about to start **building** (not just planning), you must claim a surface in `../Mentat/in-flight/` and run the air-traffic-control conflict check first. See the parent `../CLAUDE.md` "Mentat Orchestration" section for the full protocol.

## Project Overview

Vanilla JavaScript UI component library for the CourtHive tournament management platform. No framework -- all components use direct DOM manipulation (`createElement`, `innerHTML`). Published as `courthive-components` on npm. Used by TMX (client PWA) and other CourtHive apps.

## Commands

```bash
pnpm install              # Install dependencies (pnpm only)
pnpm dev                  # Vite dev server
pnpm build                # Vite production build to dist/
pnpm test                 # Vitest (single run)
pnpm test:watch           # Vitest watch mode
pnpm lint                 # ESLint with auto-fix
pnpm format               # Prettier on src/
pnpm storybook            # Storybook dev server on :6006
pnpm build-storybook      # Build static Storybook
```

## Architecture

### Source Layout

```text
src/
  components/    -- individual UI components (drawBracket, scoring, dialogs, etc.)
  compositions/  -- higher-level composed views (tournament pages, event views)
  constants/     -- shared string constants
  data/          -- static data (countries, flags)
  helpers/       -- DOM helpers, formatting utilities
  assets/        -- CSS, icons, static assets
  stories/       -- Storybook stories
  styles/        -- global CSS and theme variables
  tools/         -- utility functions
  utilities/     -- shared utility modules
  validators/    -- input validation functions
  types.ts       -- shared TypeScript type definitions
```

### Component Pattern

Components are factory functions that return DOM elements. They accept configuration objects and create elements via `document.createElement`. No virtual DOM, no reactivity system.

### Storybook

Storybook (HTML-Vite) on port 6006 for component development and visual testing. Stories in `src/stories/` and co-located `*.stories.ts` files.

### Build Output

Vite builds to `dist/` as both ES module (`courthive-components.es.js`) and UMD (`courthive-components.umd.js`) with TypeScript declarations.

## Key Conventions

- **Package manager**: pnpm only
- **No framework**: Vanilla JS/TS only -- no React, Vue, or Angular
- **Theme variables**: Use `--sp-*` / `--chc-*` CSS custom properties -- never use `--bulma-*` or Bulma classes
- **DOM data attributes**: Use `.dataset` not `.getAttribute()`
- **`noImplicitAny`**: false in tsconfig
- **`@typescript-eslint/no-explicit-any`**: OFF
- **Imports**: Sort longest-first
- **Lint discipline**: Zero warnings -- fix all before deploy

## Ecosystem Standards

This repo follows CourtHive ecosystem coding standards documented in the Mentat orchestration repo at `../Mentat/standards/coding-standards.md`.
