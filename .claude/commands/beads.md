---
description: Initialize Beads context and check ready tasks
argument-hint: [--init | --status | --ready]
---

# Beads Workflow Context

You are working with Beads - a lightweight, git-based issue tracker designed for AI coding agents.

## Quick Commands Reference

### Query Tasks
```bash
# See tasks ready to work on (no blockers)
bd ready --json

# List all tasks
bd list --json

# Show specific task details
bd show <id>

# Check dependency tree
bd dep tree <id>
```

### Claim & Update Tasks
```bash
# Claim a task (mark as in_progress)
bd update <id> --status in_progress

# Add progress notes (IMPORTANT: Write as if explaining to a future agent with ZERO context)
bd update <id> --notes "
COMPLETED: <what was finished>
IN PROGRESS: <current work>
NEXT: <immediate next steps>
FILES: <relevant files>
BLOCKERS: <any blockers>
"

# Complete a task
bd close <id> --reason "Done: <summary>"
```

### Create Tasks
```bash
# Create a new task
bd create "Task title" -t <task|feature|bug|epic> -p <0-4>

# Create with dependency
bd create "Child task" --deps <parent-id>

# Track discovered work
bd create "Bug found during X" -t bug -p 0
```

## Agent Workflow Loop

```
START → bd ready --json
            ↓
        Có task? ─No→ DONE!
            ↓Yes
        bd update <id> --status in_progress
            ↓
        CODE, CODE, CODE...
            ↓
        Phát hiện bug? ─Yes→ bd create "Bug" -t bug
            ↓No
        bd update <id> --notes "..."
            ↓
        bd close <id> --reason "Done"
            ↓
        [Loop back to bd ready]
```

## Priority Levels

| Priority | Meaning |
|----------|---------|
| 0 | P0 - Critical (làm ngay!) |
| 1 | P1 - High (quan trọng) |
| 2 | P2 - Medium (bình thường) |
| 3 | P3 - Low (có thể chờ) |
| 4 | P4 - Backlog (khi rảnh) |

## Critical Rules

1. **ALWAYS query `bd ready` before starting work** - Don't guess what to do
2. **ALWAYS claim task before starting** - Prevents duplicate work
3. **ALWAYS write detailed notes** - Future agents have ZERO context after compact
4. **NEVER work on blocked tasks** - Respect dependency graph
5. **bd sync before session end** - Preserve state to Git

## Execution Based on Arguments

If user provided `$ARGUMENTS`:

- `--init`: Run `bd init --prefix troll` to initialize Beads in this project
- `--status`: Run `bd list --json` to show all tasks
- `--ready`: Run `bd ready --json` to show tasks ready to work on

If no arguments provided, run `bd ready --json` by default to check what's available to work on.
