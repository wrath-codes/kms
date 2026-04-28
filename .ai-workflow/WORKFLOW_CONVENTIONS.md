# KMS Workflow Conventions

Conventions for solo BDFL (Benevolent Dictator For Life) development on KMS using the Praxis workflow.

---

## 1. Development Cycle: The Praxis Loop

KMS follows a structured, repeating cycle that ensures every iteration makes the next easier:

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

**When**: When you have an idea or see an opportunity for improvement.

**What happens**:
- Open a conversational session to explore the problem space
- Question assumptions, play devil's advocate
- Expand possibilities, identify constraints
- Narrow down to the core insight
- Produces: `.ai-workflow/ideas/YYYYMMDD-slug.md` with status `raw`

**Key rule**: No code, no technical design. Just thinking.

**Example**:
```bash
/px-brainstorm Better performance for 50k+ commands without hitting memory limits
```

Output: `.ai-workflow/ideas/20260428-inverted-index-search.md`

### Phase 2: Plan (`/px-plan`)

**When**: After brainstorming converges on a clear idea.

**What happens**:
- Take the idea and break it into concrete, actionable steps
- Research implementation approaches
- Define acceptance criteria
- Identify dependencies and risks
- Produces: `.ai-workflow/plans/YYYYMMDD-slug-phase-1.md` with status `draft` → `ready`

**Key rule**: No implementation yet. Just the roadmap.

**Process**:
```bash
/px-plan .ai-workflow/ideas/20260428-inverted-index-search.md
```

Output: `.ai-workflow/plans/20260428-inverted-index-search-phase-1.md` (ready for implementation)

### Phase 3: Implement (`/px-implement`)

**When**: Plan is finalized and ready.

**What happens**:
- Execute the plan step-by-step
- Each step is a Git commit
- Tests are written as you go
- Produces: Feature branch (`implement/plan-slug`) with working code

**Key rule**: Follow the plan. Commit frequently. Test as you go.

**Process**:
```bash
git checkout -b implement/inverted-index-search-phase-1
/px-implement .ai-workflow/plans/20260428-inverted-index-search-phase-1.md
```

Each step in the plan becomes a commit:
```
Step 1: Implement BM25 scoring algorithm.
Step 2: Add unit tests for scoring.
Step 3: Wire into SearchService.
...
```

When done:
```bash
git push origin implement/inverted-index-search-phase-1
```

### Phase 4: Review (`/px-review`)

**When**: Implementation branch is ready for review.

**What happens**:
- Run specialized reviewer agents (security, architecture, performance, code-quality)
- Each reviewer examines the diff and provides findings
- You read findings and decide which to act on
- Produces: Review findings in the workflow directory

**Key rule**: Reviewers suggest, you decide.

**Process**:
```bash
git checkout implement/inverted-index-search-phase-1
/px-review staged
```

Reviewers check:
- **Code Quality**: Naming, style, duplication
- **Architecture**: Layer boundaries, testability
- **Performance**: Bottlenecks, memory usage
- **Security**: Input validation, resource limits
- **Simplicity**: Unnecessary complexity, readability

Act on findings you agree with, skip the rest.

### Phase 5: Retrospect (`/px-retrospect`)

**When**: Implementation is complete, merged, and deployed.

**What happens**:
- Reflect on what you learned
- Document surprising findings
- Capture anti-patterns to avoid
- Record decisions and their rationale
- Produces: `.ai-workflow/learnings/YYYYMMDD-slug.md`

**Key rule**: Learnings feed back into the next cycle.

**Process**:
```bash
/px-retrospect .ai-workflow/plans/20260428-inverted-index-search-phase-1.md
```

Record:
- What you expected vs. what actually happened
- Key decisions and why they mattered
- Bugs or gotchas discovered
- Patterns that worked well
- Anti-patterns to avoid next time

**Example learning**:
```markdown
---
title: BM25 Scoring Breaks on Empty Queries
category: surprise
plans: [.ai-workflow/plans/20260428-inverted-index-search-phase-1.md]
tags: [search, performance, edge-cases]
---

## Context
Implemented BM25 scoring for inverted index. During testing discovered that empty query strings
crash the algorithm because of division by zero in TF-IDF calculation.

## Insight
Need to always guard against empty input in scoring algorithms, even if the UI prevents them.
Pure functions should be defensive.

## Recommendation
- Add explicit empty-string guard at the start of scoreMatch()
- Add unit test for edge case
- Apply same pattern to other scoring functions
```

---

## 2. Solo Development Workflow

### Session Structure

**Start of session**: 
```bash
cd /Users/wrath/projects/kms
znt session start --session-name "Implement inverted index search"
```

This creates a session entry in `.zenith/trail/` that tracks everything you do.

**During session**:
- Use Praxis skills as needed
- Make commits regularly
- Note any findings in `.ai-workflow/` if they emerge
- Run tests frequently

**End of session**:
```bash
znt wrap-up --summary "Completed BM25 scoring implementation and all tests passing"
```

This closes the session and records what was accomplished.

### Definition of Done (Solo)

A task is **done** when:

- ✅ Code is written and compiles without errors
- ✅ Tests are written and all passing
- ✅ Code follows architectural & style conventions
- ✅ Code review (self-review) is complete
- ✅ Git history is clean (one commit per logical step)
- ✅ Commit messages follow conventions
- ✅ Related documentation is updated
- ✅ No breaking changes to public APIs (or documented if necessary)
- ✅ Performance is acceptable (benchmarks pass if relevant)

### Self-Review Process

Before merging your feature branch:

```bash
git log main..HEAD --oneline          # Review commit history
git diff main HEAD -- src/            # Review all changes
bun run test:unit                      # Run all tests
bun run compile                        # Ensure clean build
/px-review staged                      # Run reviewer agents
```

Ask yourself:
- [ ] Do I understand what each commit does?
- [ ] Does the implementation match the plan?
- [ ] Are there any obvious bugs or edge cases?
- [ ] Is the code readable?
- [ ] Are tests comprehensive?
- [ ] Does it follow conventions?
- [ ] Did I learn anything? (Note for retrospect)

---

## 3. Git Workflow

### Branch Naming

```
implement/plan-slug              # Feature branches
main                             # Always deployable
```

**Examples**:
```
implement/inverted-index-search-phase-1
implement/fix-context-batching
implement/perf-tune-render
```

### Commit Strategy

**One logical unit per commit.** Each commit should be:
- Buildable (no broken intermediate states)
- Testable (new tests included if needed)
- Reviewable (not too large)

**Format**:
```
Subject: Implement BM25 scoring algorithm.

Detailed explanation of what changed and why. Reference the plan step if helpful.

Example:
  - Added bm25() function to InvertedIndex
  - Scoring formula: (1 + tf) * log(N / df) where tf=term frequency, df=document frequency
  - Added comprehensive unit tests covering edge cases
```

**Commit size guidance**:
- **Small**: 1-3 files, <200 LOC changes → 1-2 min to review
- **Medium**: 3-5 files, <500 LOC → 5-10 min
- **Large**: 5+ files, >500 LOC → split into multiple commits

### Merge Strategy

Once implementation is complete and self-reviewed:

```bash
git checkout main
git pull origin main
git merge --ff-only implement/inverted-index-search-phase-1
git push origin main
```

Or, if you prefer a merge commit for clarity:
```bash
git merge --no-ff implement/inverted-index-search-phase-1 -m "feat: Implement inverted index search for 50k+ commands."
```

Keep history clean. Rebase if needed to avoid merge commits for small features.

---

## 4. Testing Strategy for Solo Dev

### Test as You Implement

For each commit, write tests:

```bash
# After implementing a feature
bun run test:unit                    # Tests pass?
bun run compile                      # Compiles?
bun run test:unit -- --coverage      # Coverage acceptable?
```

**Coverage target**: >80% for critical paths (services, domain logic)

**Exception**: UI code (whichKeyMenu) can be lower coverage since VS Code integration is hard to test

### Unit Tests: Test Pure Functions

```typescript
describe("scoreMatch", () => {
  it("scores exact matches highest", () => {
    const result = scoreMatch("format", makeCommand("Format Document"))
    expect(result!.score).toBeCloseTo(1.0)
  })

  it("returns null on no match", () => {
    const result = scoreMatch("xyz", makeCommand("Format Document"))
    expect(result).toBeNull()
  })
})
```

### Integration Tests: Test Services

```typescript
layer(TestLayer)("SearchService", (it) => {
  it.effect("finds registered commands", () =>
    Effect.gen(function* () {
      const registry = yield* RegistryService
      const search = yield* SearchService
      yield* registry.register([makeCommand("Format Document")])
      const results = yield* search.search("format")
      expect(results.length).toBe(1)
    })
  )
})
```

### Performance Tests: Verify Targets

```typescript
it("searches 50k commands in under 10ms", () => {
  const start = performance.now()
  const results = search("format", largeRegistry)
  const duration = performance.now() - start
  expect(duration).toBeLessThan(10)
})
```

---

## 5. Documentation & Knowledge Management

### Idea Files

Location: `.ai-workflow/ideas/YYYYMMDD-slug.md`

**Status progression**: `raw` → `planning` → `in-progress` → `done` / `abandoned`

```yaml
---
title: Better Performance for 50k+ Commands
date: 2026-04-28
status: raw
tags: [search, performance, index]
---

## Problem
Current search is O(n) across all commands. At 50k+ commands, latency exceeds targets.

## Core Idea
Implement an inverted index with BM25 scoring for sub-10ms search latency.

## Open Questions
- How to handle updates to command registry?
- Should indexing run in a worker thread?

## Possible Directions
1. In-memory inverted index (simplest)
2. Worker thread indexing (better perf)
3. Pre-indexed file (not needed for VS Code)
```

### Plan Files

Location: `.ai-workflow/plans/YYYYMMDD-slug-phase-N.md`

**Status progression**: `draft` → `ready` → `in-progress` → `done` / `abandoned`

```yaml
---
title: Inverted Index Search - Phase 1
date: 2026-04-28
status: ready
ideas: [.ai-workflow/ideas/20260428-inverted-index-search.md]
group: inverted-index-search
phase: 1
tags: [search, performance, index]
---

## Goal
Implement BM25-based inverted index for fast command search at scale.

## Background
Researched full-text search algorithms. BM25 is industry standard. Can be implemented
in pure TypeScript without external deps.

## Steps

### Step 1: Pure Data Structure
- Implement `InvertedIndex` interface (documents, postings, metadata)
- Implement `buildIndex(commands)` to construct the index
- Add unit tests for index construction

### Step 2: Scoring Algorithm
- Implement BM25 scoring function
- Handle edge cases (empty query, no matches)
- Add comprehensive tests

### Step 3: Integration
- Wire into RegistryServiceAdvanced
- Update SearchService to use BM25
- Benchmark: verify <10ms on 50k commands

## Acceptance Criteria
- [ ] Index builds in <100ms for 50k commands
- [ ] Search completes in <10ms for typical queries
- [ ] All unit tests passing
- [ ] No regression on existing search tests

## Dependencies
- None (pure TypeScript)
```

### Learning Files

Location: `.ai-workflow/learnings/YYYYMMDD-slug.md`

**Category**: `pattern` | `anti-pattern` | `decision` | `surprise`

```yaml
---
title: Always Guard Against Empty Input in Pure Functions
category: pattern
plans: [.ai-workflow/plans/20260428-inverted-index-search-phase-1.md]
tags: [functions, correctness, edge-cases]
---

## Context
Implemented BM25 scoring. During testing, empty query strings crashed the algorithm.
Pure functions should never assume valid input, even if UI prevents bad input.

## Insight
Defensive programming at the algorithm boundary pays off. Edge case handling
in pure functions is cheap and prevents cascading failures.

## Evidence
- Bug: `scoreMatch("", cmd)` threw division by zero
- Fix: Added `if (query.length === 0) return special case`
- Cost: 2 lines, 1 test
- Benefit: Prevents entire service from crashing

## Recommendation
When writing pure scoring/search functions:
1. Always handle empty input explicitly
2. Always handle "no matches" case
3. Return null or special value, never throw (let caller decide)
4. Add explicit unit test for empty/no-match cases
```

### Tags Registry

File: `.ai-workflow/tags`

One tag per line, alphabetically sorted. Praxis automatically maintains this.

**Examples**:
```
architecture
concurrency
debug
error-handling
index
performance
search
testing
ui
```

---

## 6. Release & Deployment

### Versioning

KMS follows Semantic Versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes to extension API or config format
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes

### Release Process

When ready to publish a version:

```bash
# 1. Ensure all changes are merged to main
git checkout main
git pull origin main

# 2. Run full test suite
bun run test:unit
bun run test:extension

# 3. Update version in package.json
vim package.json
# Change: "version": "0.1.0" -> "0.2.0"

# 4. Update CHANGELOG.md
vim CHANGELOG.md
# Add section for v0.2.0 with features/fixes

# 5. Commit version bump
git add package.json CHANGELOG.md
git commit -m "chore: Bump version to 0.2.0."

# 6. Tag the release
git tag v0.2.0
git push origin main v0.2.0

# 7. Build the extension
bun run compile

# 8. Create release on GitHub
# GitHub UI: Releases → Draft new release
# Tag: v0.2.0, Release title: "v0.2.0", Paste CHANGELOG section
```

### Deployment Target

Currently KMS is:
- ✅ Buildable locally
- ✅ Fully tested
- 🚧 Ready for VS Code Marketplace (needs setup)

When ready to publish to marketplace:
```bash
npm install -g vsce
vsce publish --pat $VSCODE_PAT
```

---

## 7. Knowledge Capture & Learning Loop

### After Each Phase Ends

1. **Update idea status**: `raw` → `planning` → `in-progress` → `done`
2. **Update plan status**: `draft` → `ready` → `in-progress` → `done`
3. **Create learning file**: Capture what you learned
4. **Update tags**: Add any new concepts discovered
5. **Commit**: `git commit -m "docs: Capture learnings from [feature]."`

### Weekly Retrospective (Optional but Recommended)

```bash
/px-retrospect
```

Review the week:
- What features were implemented?
- What surprised you?
- What patterns worked well?
- What will you do differently next time?

### Quarterly Review (Optional)

Review all learnings from the past 3 months:
- Are there recurring patterns?
- Which architectural decisions paid off?
- What anti-patterns should you avoid?
- What areas need more work?

---

## 8. Quick Reference: Command Checklists

### Starting a New Feature

```bash
# 1. Brainstorm the idea
/px-brainstorm [idea description]

# 2. Review the generated idea file
vim .ai-workflow/ideas/YYYYMMDD-slug.md

# 3. Plan the implementation
/px-plan .ai-workflow/ideas/YYYYMMDD-slug.md

# 4. Review the plan
vim .ai-workflow/plans/YYYYMMDD-slug-phase-1.md

# 5. Start implementation
git checkout -b implement/plan-slug
/px-implement .ai-workflow/plans/YYYYMMDD-slug-phase-1.md

# 6. As you implement, follow the plan steps
# Each step = 1 commit
# Commit frequently, test as you go
```

### Before Merging

```bash
# 1. Run all tests
bun run test:unit
bun run test:extension

# 2. Verify build
bun run compile

# 3. Check code
git log main..HEAD --oneline
git diff main HEAD -- src/

# 4. Self-review
/px-review staged

# 5. Merge when satisfied
git checkout main
git merge --ff-only implement/plan-slug
git push origin main
```

### After Merging

```bash
# 1. Retrospect
/px-retrospect .ai-workflow/plans/YYYYMMDD-slug-phase-1.md

# 2. Update plan status
vim .ai-workflow/plans/YYYYMMDD-slug-phase-1.md
# Change: status: in-progress -> done

# 3. Commit learnings
git add .ai-workflow/
git commit -m "docs: Capture learnings from [feature]."
```

---

## 9. Handling Interruptions & Context Switches

### If You Get Interrupted Mid-Feature

```bash
# Save state to the plan file
vim .ai-workflow/plans/YYYYMMDD-slug-phase-1.md
# Add a note at the top:
# > **PAUSED**: Step 3 in progress. BM25 scoring done, needs integration testing.

# Stash any uncommitted work
git stash

# Switch context
git checkout main
/px-brainstorm [new idea]
```

When resuming:
```bash
git checkout implement/plan-slug
git stash pop

# Review where you left off
vim .ai-workflow/plans/YYYYMMDD-slug-phase-1.md
# See the note about Step 3

# Continue from there
/px-implement .ai-workflow/plans/YYYYMMDD-slug-phase-1.md
```

### If a Bug Surfaces During Development

If you discover a bug unrelated to the current feature:
1. Create a note in `.ai-workflow/ideas/` for it
2. Finish current feature first
3. Plan and implement the bug fix separately

This keeps context focused and history clean.

---

## 10. Personal Notes & Decision Log

Use `.ai-workflow/learnings/` to record decisions and their rationale:

```yaml
---
title: Why We Use Effect-TS for Services
category: decision
tags: [architecture, effect, libraries]
---

## Decision
All services are built on Effect-TS Context.Tag + Layer pattern.

## Alternatives Considered
1. Direct promise-based services (less composable)
2. Dependency injection framework (too heavyweight)
3. Factory functions (less type-safe)

## Chosen: Effect Layers
- Explicit dependency declaration
- Composable at different levels (simple vs advanced)
- Excellent testing support (mock layers)
- Built-in tracing & observability
- Matches VS Code extension use case (async boundaries)

## Rationale
Effect layers make it easy to swap implementations (e.g., RegistryService →
RegistryServiceAdvanced). This supports incremental optimization without
rewriting the whole extension.
```

---

## Summary

The solo BDFL workflow for KMS:

1. **Brainstorm** ideas (conversational, no code)
2. **Plan** the implementation (steps, acceptance criteria)
3. **Implement** following the plan (1 commit per step)
4. **Review** your own code (checklist-based)
5. **Retrospect** to capture learnings (feeds next cycle)

This cycle ensures that each iteration:
- ✅ Makes decisions explicit
- ✅ Captures knowledge for future you
- ✅ Maintains code quality
- ✅ Prevents repeating mistakes
- ✅ Scales to larger features gracefully

**The key insight**: Future you is a collaborator. Leave clear notes, clean code, and documented learnings so resuming work is effortless.

