# KMS AI Workflow

Praxis-based development workflow for the KMS (Knowledge Management System) VS Code extension.

---

## Quick Navigation

### 📖 Conventions (Read First)

- **[ARCHITECTURAL_CONVENTIONS.md](./ARCHITECTURAL_CONVENTIONS.md)** — How to design services, layers, and dependencies
- **[CODE_STYLE_CONVENTIONS.md](./CODE_STYLE_CONVENTIONS.md)** — How to write code (naming, testing, comments, style)
- **[WORKFLOW_CONVENTIONS.md](./WORKFLOW_CONVENTIONS.md)** — Solo BDFL development cycle (Praxis loop, Git, releases)

### 📂 Project Structure

- **ideas/** — Brainstormed concepts (status: raw → planning → in-progress → done/abandoned)
- **plans/** — Implementation roadmaps (status: draft → ready → in-progress → done/abandoned)
- **learnings/** — Captured insights (category: pattern | anti-pattern | decision | surprise)
- **agents/** — Reviewer agents and sub-agents
  - **agents/reviewers/** — Code review checkers
    - `kms-conventions.md` — Architecture and style compliance
    - `kms-performance.md` — Performance targets and optimization
    - (Standard reviewers: security, code-quality, architecture, simplicity, etc.)
- **tags** — Registry of tags used across all documents (auto-maintained)

---

## The Development Loop

KMS follows the **Praxis cycle** for structured, knowledge-building development:

```
┌─────────────┐      ┌──────────┐      ┌─────────────┐
│ Brainstorm  │─────▶│ Plan     │─────▶│ Implement   │
│  (px-brain) │      │(px-plan) │      │(px-implement)
└─────────────┘      └──────────┘      └─────────────┘
       ▲                                       │
       │              ┌──────────────────────┘
       │              │
       │              ▼
       │         ┌──────────┐
       │         │ Review   │
       │         │(px-review)
       │         └────┬─────┘
       │              │
       │              ▼
       │         ┌──────────────┐
       │         │ Retrospect   │
       │         │(px-retrospect)
       │         └──────┬───────┘
       │                │
       └────────────────┘
     Learnings feed back
```

### Phase 1: Brainstorm (`/px-brainstorm`)

Conversational exploration of an idea. No code, no design.

```bash
/px-brainstorm Better performance for 50k+ commands
```

Produces: `.ai-workflow/ideas/YYYYMMDD-slug.md` (status: `raw`)

### Phase 2: Plan (`/px-plan`)

Turn the idea into concrete steps, acceptance criteria, dependencies.

```bash
/px-plan .ai-workflow/ideas/YYYYMMDD-slug.md
```

Produces: `.ai-workflow/plans/YYYYMMDD-slug-phase-1.md` (status: `draft` → `ready`)

### Phase 3: Implement (`/px-implement`)

Execute the plan step-by-step, one commit per step.

```bash
git checkout -b implement/plan-slug
/px-implement .ai-workflow/plans/YYYYMMDD-slug-phase-1.md
```

Produces: Feature branch with working, tested code

### Phase 4: Review (`/px-review`)

Run reviewer agents on your code. Decide which findings to act on.

```bash
/px-review staged
```

Reviewers check:
- **kms-conventions** — Architecture & style compliance
- **kms-performance** — Performance targets met?
- **code-quality** — Naming, duplication, clarity?
- **architecture** — Layer boundaries, testability?
- **security** — Input validation, safe defaults?

### Phase 5: Retrospect (`/px-retrospect`)

Capture what you learned. Feed learnings back into future cycles.

```bash
/px-retrospect .ai-workflow/plans/YYYYMMDD-slug-phase-1.md
```

Produces: `.ai-workflow/learnings/YYYYMMDD-slug.md` (category: pattern | anti-pattern | decision | surprise)

---

## Before You Code

1. **Read conventions first**: Start with [ARCHITECTURAL_CONVENTIONS.md](./ARCHITECTURAL_CONVENTIONS.md)
2. **Check learnings**: Look in `learnings/` for patterns and anti-patterns you might face
3. **Review existing code**: Check `src/` for examples of how to structure services

---

## Definition of Done

A feature is **done** when:

- ✅ Code written and compiles
- ✅ Tests written and passing (>80% coverage for services)
- ✅ Follows ARCHITECTURAL_CONVENTIONS.md
- ✅ Follows CODE_STYLE_CONVENTIONS.md
- ✅ Passes all reviewer agents (`/px-review`)
- ✅ Git history clean (one commit per logical step)
- ✅ Related documentation updated
- ✅ Performance targets met (if applicable)

---

## Common Workflows

### Starting a New Feature

```bash
# 1. Brainstorm the idea
/px-brainstorm [idea]
vim .ai-workflow/ideas/YYYYMMDD-slug.md  # Review

# 2. Plan the implementation
/px-plan .ai-workflow/ideas/YYYYMMDD-slug.md
vim .ai-workflow/plans/YYYYMMDD-slug-phase-1.md  # Review

# 3. Create feature branch
git checkout -b implement/plan-slug

# 4. Implement following the plan
/px-implement .ai-workflow/plans/YYYYMMDD-slug-phase-1.md
# (Follow each step, commit after each)

# 5. Test thoroughly
bun run test:unit
bun run compile

# 6. Review your code
/px-review staged
# (Read findings, decide what to fix)

# 7. Merge when ready
git checkout main
git merge --ff-only implement/plan-slug
git push origin main

# 8. Retrospect to capture learnings
/px-retrospect .ai-workflow/plans/YYYYMMDD-slug-phase-1.md
git add .ai-workflow/learnings/
git commit -m "docs: Capture learnings from [feature]."
```

### Reviewing Your Own Code

```bash
# Before merging to main
git log main..HEAD --oneline           # Check commit history
git diff main HEAD -- src/             # Review all changes
bun run test:unit                       # All tests pass?
bun run compile                         # Clean build?
/px-review staged                       # Run reviewer agents

# Read findings:
vim .ai-workflow/findings-*.md

# Fix issues you agree with
git add [files]
git commit -m "fix: [issue from review]."

# Then merge
```

### Searching for Knowledge

```bash
# Look for learnings on a topic
grep -r "batching\|performance\|caching" .ai-workflow/learnings/

# Check what patterns worked before
grep -r "pattern" .ai-workflow/learnings/ | grep "category: pattern"

# See anti-patterns to avoid
grep -r "anti-pattern" .ai-workflow/learnings/ | head -10
```

---

## Tags

All documents are tagged for easy discovery. Common tags:

```
architecture          performance
batching              testing
caching               ui
concurrency           worker
error-handling        (add more as needed)
index
```

Find docs by tag:

```bash
grep "tags:.*performance" .ai-workflow/**/*.md
grep "tags:.*testing" .ai-workflow/**/*.md
```

---

## Key Principles

1. **Explicit is better than implicit** — Declare dependencies, error types, tags
2. **Document the why, not the what** — Code explains what; comments explain why
3. **Learnings feed forward** — Retrospects inform future planning
4. **Tests are documentation** — Tests show intended behavior and edge cases
5. **Pure functions first** — Extract logic, then wrap with Effect
6. **Batch external calls** — ContextService, DispatchQueue patterns
7. **Version everything** — Registry versions, render cache versions, plan phases

---

## Resources

- **Effect-TS**: https://effect.website
- **VS Code Extension API**: https://code.visualstudio.com/api
- **KMS ARCHITECTURE.md**: [../ARCHITECTURE.md](../ARCHITECTURE.md)
- **KMS CODEBASE_EXPLORATION.md**: [../CODEBASE_EXPLORATION.md](../CODEBASE_EXPLORATION.md)

---

## Current Status

**Implementation**: ✅ Complete (Phase 1–4 all done)
**Testing**: ✅ 76 tests passing
**Documentation**: ✅ Comprehensive (architecture, codebase, conventions)
**Conventions**: ✅ Documented (architecture, code style, workflow)

**Next**: Review, optimize, prepare for marketplace publication.

