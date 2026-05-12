# Git Commit Guardian — Project Memory

## Project: obsidian-spotify-sorter

**Type:** Obsidian community plugin (TypeScript/esbuild)
**Branch:** master (main branch for PRs: main)

## Key Files to Always Gitignore
- `data.json` — Obsidian writes this at runtime to store plugin settings; must never be tracked
- `main.js` — compiled output (already gitignored)
- `*.js.map` — source maps (already gitignored)
- `node_modules/` — dependencies (already gitignored)

## Commit Conventions Observed
- Uses conventional commits (type: description)
- No scope has been used in commits so far (both commits are scopeless)
- `chore` used for project setup and release-prep tasks

## Tech Stack Notes
- Build: esbuild via npm scripts (`npm run build`, `npm run dev`)
- Dev deps only: @types/node, builtin-modules, esbuild, obsidian, tslib, typescript
- OAuth: uses `obsidian://spotify-auth` custom URI scheme (NOT localhost HTTP server)
- Obsidian min API version: 0.15.0 (from versions.json)

## Obsidian Plugin Registry Requirements
- `LICENSE` file required
- `versions.json` required (maps plugin version -> min Obsidian API version)
- `manifest.json` required (already present from initial setup)
