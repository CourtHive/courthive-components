# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mentat Orchestration (READ FIRST)

Before doing anything else, read `../Mentat/CLAUDE.md`, `../Mentat/TASKS.md`, `../Mentat/standards/coding-standards.md`, and every file in `../Mentat/in-flight/`. Mentat is the orchestration layer for the entire CourtHive ecosystem; its standards override per-repo conventions when they conflict. If you are about to start **building** (not just planning), you must claim a surface in `../Mentat/in-flight/` and run the air-traffic-control conflict check first. See the parent `../CLAUDE.md` "Mentat Orchestration" section for the full protocol.

## Branching — cut from `dev`, not `main` (CA, 2026-09-28)

`dev` is this repo's integration branch. **Branch from `origin/dev` and open PRs against `dev`.**
`main` advances only at checkpoints, by merging `dev` into it. This is the pattern `factory` has used
since 2026-09-12; CA: *"Let's start using a dev branch after this ... so we can start working the way
we're working in the factory repo."*

`dev` was created from `main` at `444ba3c` on 2026-09-28, byte-identical to it.

**A checkpoint merge does NOT publish.** Verified by reading the workflows rather than assumed:

| workflow | trigger | consequence |
|---|---|---|
| `ci.yml` | bare `pull_request:` + `push: [main]` | a PR into `dev` gets the full `verify` gate. A direct push to `dev` gets **no** push-triggered run, so land work by PR |
| `release-please.yml` | `push: [main]` ONLY | the checkpoint merge **refreshes** the perpetual `chore(main): release X.Y.Z` PR. Nothing is tagged and nothing is published |
| `npm-publish.yml` | `release: published` | unaffected. Publishing still takes the deliberate second act of merging the release PR |

**One repo setting had to change, and it is part of the strategy.** `delete_branch_on_merge` was
**true** and is now **false**. A checkpoint PR has `dev` as its HEAD branch, so auto-delete deletes the
integration branch on every checkpoint — and GitHub then silently **retargets open PRs to `main`**,
which is how work bypasses the integration branch with nobody choosing that. The factory hit exactly
this on 2026-09-13; see `../Mentat/standards/coding-standards.md` § "Branch off `dev`, not `master`".

The cost is that merged branches no longer self-delete. Prune on PR STATE, not ancestry — a
squash-merged branch never looks merged by `git merge-base --is-ancestor`:

```bash
gh pr list --repo CourtHive/courthive-components --state merged --head <branch>
```

The checkpoint merge itself must be a **merge commit**, not a squash: squashing collapses every
conventional commit into one and guts the release-please changelog.

### After a release: the back-merge (CA, 2026-10-05)

release-please's `chore(main): release X.Y.Z` commit (version, CHANGELOG, manifest) lands on `main` only,
so every release is followed by merging `main` back into `dev`. **`back-merge.yml` opens that PR** on
`release: published` (`chore: merge main back into dev after vX.Y.Z`), with the `courthive-release-bot`
App token so CI runs on it (a PR opened by `GITHUB_TOKEN` gets no workflow runs). **Merge it with a merge
commit, never a squash.** It is not auto-merged. If a release's run was missed:
`gh workflow run back-merge.yml -R CourtHive/courthive-components`.

**The release path takes the light path in CI**, as the factory's release PRs do (#5169(factory)).
`.github/scripts/release-scope.sh` marks a PR light when it is the release-please PR into `main` or the
back-merge PR (`main` -> `dev`) AND its diff is only the version files: `package.json`'s `"version"`
line, `CHANGELOG.md`, `.release-please-manifest.json`. `verify` then skips everything after the lockfile
guard but still reports, so `main`'s required check passes. Any other change gets the full run.

## Project Overview

Vanilla JavaScript UI component library for the CourtHive tournament management platform. No framework -- all components use direct DOM manipulation (`createElement`, `innerHTML`). Published as `courthive-components` on npm. Used by TMX (client PWA) and other CourtHive apps.

## Commands

```bash
pnpm install              # Install dependencies (pnpm only)
pnpm dev                  # Vite dev server
pnpm build                # Vite production build to dist/
pnpm test                 # Vitest (single run)
pnpm test:watch           # Vitest watch mode
pnpm lint                 # ESLint — non-mutating, fails on any warning
pnpm lint:fix             # ESLint with auto-fix (rewrites source)
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
