# Project: POE2 Endgame Companion

## What This Is
Path of Exile 2 character analyser. Reads poe.ninja's computed character data and turns it into ranked, evidence-backed findings, plus a progression checklist, Atlas planner and farming dashboard.

## Commands (Node >=22, see `.nvmrc`)
- `npm run typecheck`: builds `@poe2/core` first; the web typecheck fails without core's `dist/`.
- `npm run lint`; `npm test` (core and web); `npm run build` (core, then web static export).
- `cd services/ninja-proxy && npm test`: the proxy is not a workspace, so the root run skips it.
- Cloud sessions: `bash scripts/cloud-setup.sh` installs from the lockfile and builds core.

## Layout
- `packages/core`: pure analyzer. `packages/data`: generated game data.
- `apps/web`: Next.js static export. `apps/mcp`: MCP server; `apps/mcp/TOOLS.md` is generated (`npm run tools -w @poe2/mcp`).
- `services/ninja-proxy`: serverless proxy, deployed separately.

## Code Conventions
- Report a range or "unknown" for any value the data cannot establish.
- Read poe.ninja's computed figures as given; derive only what the payload lacks.
- Label simulated values `pob-sim`; they come only from the injected PoB transport.
- Credit a keystone only when its effect is visible in stats.
- Keep `packages/core` free of I/O (fetch and PoB transport are injected) and the web app static-export compatible.
- Import with `.js` suffixes (`verbatimModuleSyntax`).

## Boundaries
- Keep every existing test; add tests next to new code.
- Golden outputs live in `packages/core/test/golden/`: regenerate with `npx vitest -u` in `packages/core`, then review the diff.
- Run typecheck, lint, tests and the proxy tests before declaring work done.
- `packages/data/generated/*.json` are large (up to 3 MB): search them with grep, read only the lines needed.

## Quick Reference
- Analyzer audit: `docs/analyzer-audit.md`; gap roadmap: `docs/mvp-gap-roadmap.md`; session state: `HANDOFF.md`.
- Data refresh: `docs/DATA-REFRESH.md`. Design: `docs/DESIGN.md`. Guide copy: `docs/GUIDE_CONTENT.md`.
- Cloud sessions: `playwright.config.ts` auto-uses the preinstalled Chromium (`CLAUDE_CODE_REMOTE=true`, never on GitHub Actions), so `npm run build`, then `npm run e2e -w @poe2/web` works. Do not run `playwright install`.
