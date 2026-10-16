# Golden outputs

`../golden.test.ts` analyses five characters and compares a stable projection of the result with the `*.expected.json` file next to this README. If the engine, the generated data or a module such as `holdingUp` changes what any of them produces, `npm test` fails with a diff.

| Name | What it is |
|---|---|
| `recorded-athrynas-v43` | The **recorded** capture in `../fixtures/athrynas-v43.json`, unmodified. |
| `no-pob-export` | **Derived.** Same character with the embedded Path of Building export removed. |
| `sparse-defence` | **Derived.** `defensiveStats` cut to life and energy shield, breakdowns removed. Records known issue B1 (absent resistances are reported as 0 by the defence summary); `holdingUp` marks them unknown. This file documents current behaviour, not correct behaviour. |
| `second-weapon-set` | **Derived.** The second weapon set made live. |
| `no-skills` | **Derived.** Per-skill damage removed. |

Only one of the five is a real capture. The others are patches (`*.patch.json`: a list of `set` / `delete` operations on dotted paths) applied to it in memory, so they pin behaviour on partial and unusual payloads but say nothing about real characters. The suite runs without a ladder sample, a passive tree or the affix data, so it does not exercise the offence grade, keystone corrections or tiered gear advice.

## Updating

Review the diff first. If it is intended: `npx vitest run -u` in `packages/core`, then commit the changed `*.expected.json` files with the change that caused them.

## Adding a real character

Capture it with the two-step read described in `../fixtures/README.md` (no pruning), save it under `../fixtures/`, and add a name to `VARIANTS` in `../golden.test.ts`. The expected file is written on the first run.
