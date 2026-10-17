# context-budget

Keeps Claude Code context usage visible and compactions useful.

- Status line: `ctx 54% · $1.23` after each turn.
- Toasts once at 60%, 80% and 90% context, reset after a compaction.
- `/budget`: context by category, per-MCP-server tokens, top memory files, always-on load vs conversation.
- `/smartcompact [extra]`: compact keeping goals, open tasks, file paths, decisions, commands and git state.
- Plain `/compact` and auto-compact use the same focus when none is typed. A focus you type is never overridden.

## Install

```
/plugin install context-budget --marketplace Demonad112/POE2-V3.0
```

Shell: `claude plugin install context-budget --marketplace Demonad112/POE2-V3.0`

## Options

`focus` (string): replaces the default compaction focus.

## Notes

Organization-managed Claude Code skips `session.compact` hooks on installed plugins; use `/smartcompact` there.
