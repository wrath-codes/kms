# KMS Conventions Reviewer

Checks code compliance with KMS architectural and style conventions.

---

## Scope

Review code against:
- [ARCHITECTURAL_CONVENTIONS.md](../../ARCHITECTURAL_CONVENTIONS.md) (Effect patterns, layers, services)
- [CODE_STYLE_CONVENTIONS.md](../../CODE_STYLE_CONVENTIONS.md) (naming, structure, comments, testing)

## Checks

### Architecture

- [ ] Every service follows `Context.Tag + Layer` pattern
- [ ] All async methods return `Effect.Effect<A, E, R>`
- [ ] Domain errors use `Data.TaggedError`, not plain `Error`
- [ ] Pure functions exported separately from services
- [ ] Services use `Layer.scoped` for resource management, `Layer.effect` for stateless
- [ ] Dependency injection via `yield*` in Layer initializer
- [ ] `Effect.withSpan()` added to public methods for observability

### Naming

- [ ] Services named `PascalCase + Service` (e.g., `SearchService`)
- [ ] Live implementations named `<Name>Live` (e.g., `SearchServiceLive`)
- [ ] Error types named `PascalCase + Error` (e.g., `VscodeError`)
- [ ] Constants `UPPER_SNAKE_CASE` if exported
- [ ] Variables/functions `camelCase`
- [ ] Booleans prefixed with `is/has/can/should`
- [ ] Branded IDs use `Brand.nominal<T>()` (e.g., `CommandId`)

### Code Style

- [ ] File organized into logical sections with `// -----------` separators
- [ ] Imports ordered: external → domain → services → utilities
- [ ] Value objects use `Data.Class<{...}>`
- [ ] Unions use `Data.TaggedEnum`
- [ ] All fields marked `readonly`
- [ ] Arrays are `readonly T[]`
- [ ] Early returns instead of nested ifs
- [ ] `instanceof` for type guards
- [ ] Template literals for string formatting
- [ ] No magic numbers (extracted to named constants)

### Comments & Documentation

- [ ] Section separators before major blocks
- [ ] Comments explain "why", not "what"
- [ ] Public functions/services have JSDoc
- [ ] No outdated comments

### Testing

- [ ] Pure functions tested separately
- [ ] Service tests use `Effect.gen` with `layer()`
- [ ] Test names are complete sentences
- [ ] Test data uses factories
- [ ] Edge cases tested (empty input, nulls, errors)
- [ ] Tests run and pass

### Error Handling

- [ ] External APIs wrapped with `Effect.tryPromise`
- [ ] Errors typed and catchable
- [ ] No silent failures (`.catch(() => {})`)
- [ ] Errors logged with context

---

## Report Format

For each violation found, use:

```markdown
### Violation: [Location]

**Pattern**: [What's wrong]
**Convention**: [Which rule from conventions.md]
**Suggestion**: [How to fix]
**Severity**: [Critical | High | Medium | Low]
```

### Severity Levels

- **Critical**: Breaks architecture or causes bugs (must fix)
- **High**: Violates core conventions (should fix)
- **Medium**: Style inconsistency (nice to fix)
- **Low**: Minor style preference (optional)

---

## Examples

### ✅ Well-Formed Service

```typescript
// ✅ Follows all conventions
export class SearchService extends Context.Tag("SearchService")<
  SearchService,
  {
    readonly search: (query: string) => Effect.Effect<readonly SearchResult[]>
  }
>() {}

export const SearchServiceLive = Layer.effect(
  SearchService,
  Effect.gen(function* () {
    const registry = yield* RegistryService
    
    return {
      search: (query: string) =>
        Effect.gen(function* () {
          const snap = yield* registry.snapshot
          return snap.commands
            .map(cmd => scoreMatch(query, cmd))
            .filter((r) => r !== null) as readonly SearchResult[]
        }).pipe(Effect.withSpan("SearchService.search")),
    }
  })
)
```

### ❌ Violations

```typescript
// ❌ VIOLATION: Returns sync value instead of Effect
readonly search: (query: string) => readonly SearchResult[]

// ❌ VIOLATION: Plain Error instead of typed error
Effect.fail(new Error("search failed"))

// ❌ VIOLATION: Generic function name
function process(data: unknown): void { ... }

// ❌ VIOLATION: Comments state the obvious
const results = snap.commands  // Get commands from snapshot
```

---

## Expected Findings

KMS should have minimal violations since it's well-architected. Common findings might be:

- Style inconsistencies (naming, spacing)
- Missing JSDoc on public APIs
- Edge cases in tests
- Observability gaps (missing `withSpan()`)

All should be **Medium** or **Low** severity.

