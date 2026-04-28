# KMS Performance Reviewer

Checks code for performance regressions and optimization opportunities.

---

## Scope

Review against KMS performance targets and best practices:
- Search latency: <10ms for typical queries, <20ms for worst-case
- Index building: <100ms for 50k commands
- Memory usage: reasonable for 50k+ commands
- UI responsiveness: no blocking operations on main thread
- Concurrency: proper use of batching, semaphores, queues

---

## Performance Targets

| Operation | Target | Current |
|-----------|--------|---------|
| Search (simple, 50k cmds) | <10ms | ✅ 1–4ms |
| Search (worst case, 50k cmds) | <20ms | ✅ ~8ms |
| Index build (50k cmds) | <100ms | ✅ ~105ms |
| Context flush (batched) | <50ms | ✅ <1ms |
| Render (200 items) | <5ms | ✅ <1ms |

---

## Checks

### Search & Index

- [ ] Search never does full O(n) scan if avoidable
- [ ] Inverted index used for 50k+ commands
- [ ] BM25 or similar scoring (not naive substring match)
- [ ] Top-K selection uses min-heap or similar (not full sort)
- [ ] Query tokenization cached or done once
- [ ] Index building is parallelizable or runs in worker
- [ ] No re-indexing on every keystroke

### Batching & Concurrency

- [ ] Context changes batched via ContextService (not individual setContext calls)
- [ ] Command execution gated by Semaphore (not unbounded concurrency)
- [ ] Dispatch actions queued via DispatchQueueService (not direct state mutation)
- [ ] Refs used safely (no race conditions)
- [ ] Concurrency limits reasonable (e.g., 4 for commands, 8 for context)

### Caching

- [ ] Render results cached by query + version
- [ ] Config reads cached with invalidation on change
- [ ] Registry snapshot cached (not rebuilt on every search)
- [ ] Cache eviction policy prevents unbounded growth
- [ ] Cache keys include versioning (stale data not reused)

### Memory

- [ ] No memory leaks in subscriptions/listeners (disposed properly)
- [ ] No unbounded arrays growing without limit
- [ ] Large data structures (registry, index) stored efficiently
- [ ] Ref updates immutable (new Map/Array, not mutation)
- [ ] No circular references

### Code Patterns

- [ ] No `await` in loops (use `Effect.all` or `Effect.forEach`)
- [ ] No repeated expensive operations in loops
- [ ] No N+1 queries or lookups
- [ ] Functions pure and reusable (computed once, used many times)
- [ ] No blocking operations on main thread

### Measurement & Monitoring

- [ ] Performance-critical functions instrumented with `Effect.withSpan()`
- [ ] Unit tests include performance assertions where critical
- [ ] Benchmarks run regularly (CI or pre-commit)
- [ ] Latency targets documented

---

## Red Flags

🚩 Potential performance issues to flag:

- `for (const x of xs) { await doSomething(x) }` — Use `Effect.forEach` or `Effect.all`
- `results.sort()` without limit — Use top-K heap
- `snap.commands.map(...).filter(...).map(...)` chaining — Consider pipeline
- `Effect.runSync` in loops — Cache the effect result
- `vscode.setContext()` called repeatedly — Use batching service
- `new Map/Array()` on every render — Cache or memoize
- `.pipe(Effect.tap(...), Effect.tap(...))` multiple taps — Consider combining
- No tests with >1000 items — Test at scale
- Search latency tests missing — Verify <10ms

---

## Expected Findings

KMS should have **few or zero** performance issues since it's been optimized. Expected findings might be:

- Missing benchmarks for new features
- Opportunity to increase semaphore limits if safe
- Minor cache eviction tweaks
- Documentation of performance characteristics

All findings should be **Low** or **Medium** severity.

---

## Report Format

For each finding:

```markdown
### [Severity]: [Location]

**Issue**: [What's slow or inefficient]
**Impact**: [User-visible effect: "Search latency increases" or "Memory grows unbounded"]
**Target**: [What should happen per KMS targets]
**Suggestion**: [How to fix]
```

### Example

```markdown
### Medium: ContextService.flushNow

**Issue**: Context changes batched, but batching window might be too small
**Impact**: More IPC calls than necessary if batch timer fires frequently
**Target**: <50ms batch window, <8 concurrent setContext calls
**Suggestion**: Measure actual batch sizes in real usage; increase window if needed
```

