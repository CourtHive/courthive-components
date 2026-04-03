# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vanilla JavaScript UI component library for the CourtHive tournament management platform. No framework -- all components use direct DOM manipulation (`createElement`, `innerHTML`). Published as `courthive-components` on npm. Used by TMX (client PWA) and other CourtHive apps.

## Commands

```bash
npm install               # Install dependencies
npm run dev               # Vite dev server
npm run build             # Vite production build to dist/
npm run test              # Vitest (single run)
npm run test:watch        # Vitest watch mode
npm run lint              # ESLint with auto-fix
npm run format            # Prettier on src/
npm run storybook         # Storybook dev server on :6006
npm run build-storybook   # Build static Storybook
```

## Architecture

### Source Layout

```
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

- **Package manager**: npm (not pnpm for this repo)
- **No framework**: Vanilla JS/TS only -- no React, Vue, or Angular
- **Theme variables**: Use `--sp-*` / `--chc-*` CSS custom properties -- never use `--bulma-*` or Bulma classes
- **DOM data attributes**: Use `.dataset` not `.getAttribute()`
- **`noImplicitAny`**: false in tsconfig
- **`@typescript-eslint/no-explicit-any`**: OFF
- **Imports**: Sort longest-first
- **Lint discipline**: Zero warnings -- fix all before deploy

## Ecosystem Standards

This repo follows CourtHive ecosystem coding standards documented in the Mentat orchestration repo at `../Mentat/standards/coding-standards.md`.
