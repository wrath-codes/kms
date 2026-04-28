# KMS Code Style Conventions

Evidence-based code style conventions extracted from the KMS codebase. These patterns ensure consistency, readability, and maintainability.

---

## 1. File Organization & Structure

### Pattern: Logical sections with visual separators

Organize file content into clear sections using comment separators:

```typescript
// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { Context, Effect, Layer } from "effect"
import { Command } from "../domain/types"

// ---------------------------------------------------------------------------
// Pure Functions (exported for testing)
// ---------------------------------------------------------------------------

export const tokenize = (text: string): readonly string[] => {
  // ...
}

// ---------------------------------------------------------------------------
// Service Interface
// ---------------------------------------------------------------------------

export class MyService extends Context.Tag("MyService")<...>() {}

// ---------------------------------------------------------------------------
// Live Implementation
// ---------------------------------------------------------------------------

export const MyServiceLive = Layer.effect(...)
```

**Why**: Makes files scannable, helps developers find sections quickly

**Example files using this pattern**:
- `src/services/RegistryService.ts`
- `src/services/SearchService.ts`
- `src/services/RenderModelService.ts`

### Rule: 80-character comment separators

```typescript
// ---------------------------------------------------------------------------
// Section Name
// ---------------------------------------------------------------------------
```

Not:
```typescript
// =========================================
// Section Name
// =========================================

// ### Section Name

/* 
   Section Name
*/
```

---

## 2. Imports Organization

### Rule: Import in this order

1. External libraries (effect, vscode, etc.)
2. Internal domain types
3. Internal services
4. Internal utilities

```typescript
// ✅ CORRECT: Organized by source
import { Context, Effect, Layer } from "effect"
import * as vscode from "vscode"

import { Command, SearchResult } from "../domain/types"
import { RegistryService } from "./RegistryService"
import { tokenize } from "./SearchService"

// ❌ AVOID: Random order
import { tokenize } from "./SearchService"
import { Effect } from "effect"
import { RegistryService } from "./RegistryService"
import { Command } from "../domain/types"
```

### Rule: Use namespace imports for external libraries

```typescript
// ✅ CORRECT
import * as vscode from "vscode"
import { Context, Effect, Layer } from "effect"

// Use as:
vscode.window.showMessage(...)
Effect.gen(...)

// ❌ AVOID: Individual destructures for large libraries
import { window, commands, workspace } from "vscode"
```

---

## 3. Type Definitions

### Rule: Use Effect's Data.Class for value objects

```typescript
// ✅ CORRECT: Immutable, auto-implements equality, serializable
export class Command extends Data.Class<{
  readonly id: CommandId
  readonly label: string
  readonly description: string | undefined
}> {}

// Usage:
const cmd = new Command({ id, label, description })

// ❌ AVOID: Plain interfaces or classes
interface Command {
  id: CommandId
  label: string
}

class Command {
  constructor(public id: CommandId, public label: string) {}
}
```

**Why**:
- Auto-implements `equals()`, `hash()` for type safety
- All fields guaranteed `readonly`
- Structural equality works out of the box
- Works seamlessly with Effect patterns

### Rule: Use branded types for domain-specific IDs

```typescript
// ✅ CORRECT: CommandId can't be confused with strings
export type CommandId = string & Brand.Brand<"CommandId">
export const CommandId = Brand.nominal<CommandId>()

// Usage:
const id: CommandId = CommandId("editor.action.openFile")

// ❌ AVOID: Type aliases that erase at runtime
export type CommandId = string  // Not distinguishable from string

// ❌ AVOID: Classes for IDs (too heavyweight)
export class CommandId {
  constructor(public readonly value: string) {}
}
```

### Rule: Use Data.TaggedEnum for disjoint unions

```typescript
// ✅ CORRECT: Type-safe pattern matching
export type DispatchAction = Data.TaggedEnum<{
  SetQuery: { readonly query: string }
  SelectItem: { readonly command: Command }
  Navigate: { readonly group: CommandGroup }
  GoBack: {}
  Close: {}
}>

export const DispatchAction = Data.taggedEnum<DispatchAction>()

// Pattern match in code:
match(action)
  .returnType<void>()
  .when({ _tag: "SetQuery" }, (a) => {
    // a: { query: string }
  })
  .when({ _tag: "Navigate" }, (a) => {
    // a: { group: CommandGroup }
  })
  .otherwise(() => {})

// ❌ AVOID: Union of classes
export type Action = SetQueryAction | SelectItemAction | NavigateAction
```

### Rule: Use readonly for immutability

```typescript
// ✅ CORRECT: All immutable
export interface PostingEntry {
  readonly docId: number
  readonly termFrequency: number
}

export type DispatchAction = Data.TaggedEnum<{
  SetQuery: { readonly query: string }
  ...
}>

// ✅ CORRECT: Readonly arrays
readonly commands: readonly Command[]
readonly items: readonly RenderItem[]

// ❌ AVOID: Mutable arrays in types
readonly commands: Command[]  // Should be readonly Command[]
```

---

## 4. Naming Conventions

### Variables

```typescript
// ✅ CORRECT: Descriptive, camelCase
const pageSize = 200
const cacheKey = `${version}:${query}`
const currentNodes = rootBindings

// ❌ AVOID: Single letters (except loop vars)
const ps = 200
const ck = `${version}:${query}`
const cn = rootBindings

// ✅ ACCEPTABLE: Loop variables can be short
for (let i = 0; i < commands.length; i++) { ... }
for (const [k, v] of map.entries()) { ... }
```

### Constants

```typescript
// ✅ CORRECT: UPPER_SNAKE_CASE for module-level constants
export const PAGE_SIZE = 200
export const DEFAULT_CONCURRENCY = 4
export const CACHE_MAX_SIZE = 50

// ✅ CORRECT: lowercase for class-level constants (in Effect.gen, not in class)
const cacheSize = 0

// ❌ AVOID: UPPER_SNAKE_CASE for non-constants
const filter = results.filter(...)  // Not a constant

// ❌ AVOID: camelCase for constants
const pageSize = 200  // Should be PAGE_SIZE if exported
```

### Booleans & Predicates

```typescript
// ✅ CORRECT: Prefix with `is`, `has`, `can`, `should`
const isCached = cache.has(key)
const hasMatches = matches.length > 0
const canProceed = size < maxSize
const shouldRetry = error instanceof RetryableError

// ❌ AVOID: Ambiguous names
const cached = cache.has(key)  // "cached" could mean the value itself
const matches = match !== null  // Confusing what "matches" refers to
```

### Functions

```typescript
// ✅ CORRECT: Verbs for actions, nouns for data transformers
function executeCommand(cmd: string) { ... }
function processResult(result: SearchResult) { ... }
function toRenderItem(result: SearchResult): RenderItem { ... }
function buildIndex(commands: Command[]): InvertedIndex { ... }

// For boolean returns, use `is/has/can/should`:
function isValidCommand(cmd: unknown): boolean { ... }
function hasResults(results: SearchResult[]): boolean { ... }

// ❌ AVOID: Generic names
function do(item: any) { ... }
function handle(data: unknown) { ... }
function process(input: Input) { ... }  // Too vague
```

### Service Methods

```typescript
// ✅ CORRECT: Consistent across services
readonly search: (query: string) => Effect.Effect<readonly SearchResult[]>
readonly register: (commands: readonly Command[]) => Effect.Effect<void>
readonly snapshot: Effect.Effect<RegistrySnapshot>
readonly version: Effect.Effect<number>

// ❌ AVOID: Inconsistent verb usage
readonly getSnapshot: Effect.Effect<RegistrySnapshot>
readonly searchQuery: (query: string) => Effect.Effect<...>
readonly reg: (commands: readonly Command[]) => Effect.Effect<void>
```

---

## 5. Function Organization

### Rule: Order functions by abstraction level

```typescript
// ✅ CORRECT: Low-level helpers first, high-level logic last
// 1. Pure utility functions
export const tokenize = (text: string): string[] => { ... }

// 2. Scoring/algorithm functions
export const scoreMatch = (query: string, cmd: Command): SearchResult | null => { ... }

// 3. Service class definition
export class SearchService extends Context.Tag(...) {}

// 4. Layer implementation (highest abstraction)
export const SearchServiceLive = Layer.effect(...)
```

### Rule: Keep functions small and focused

```typescript
// ✅ CORRECT: Single responsibility
const goBack = (): boolean => {
  const parent = stack.pop()
  if (!parent) return false
  currentTitle = parent.title
  currentNodes = parent.nodes
  renderCurrent()
  return true
}

// ❌ AVOID: Function doing multiple unrelated things
const handleNavigation = (direction: "back" | "forward") => {
  if (direction === "back") {
    // ... pop and restore state
  } else {
    // ... navigate forward, update cache, refresh UI
  }
}
```

---

## 6. Control Flow & Conditionals

### Rule: Early returns instead of nested ifs

```typescript
// ✅ CORRECT: Guard clause pattern
export const scoreMatch = (query: string, command: Command): SearchResult | null => {
  if (query.length === 0) {
    return new SearchResult({ command, score: 0, matches: [] })
  }

  const queryTokens = tokenize(query)
  let totalScore = 0

  for (const qt of queryTokens) {
    let bestScore = 0
    // ... scoring logic
    if (bestScore === 0) return null  // Early return if no match
    totalScore += bestScore
  }

  return new SearchResult({ command, score: totalScore / queryTokens.length, matches })
}

// ❌ AVOID: Nested conditionals
export const scoreMatch = (query: string, command: Command): SearchResult | null => {
  if (query.length === 0) {
    return new SearchResult({ command, score: 0, matches: [] })
  } else {
    const queryTokens = tokenize(query)
    if (queryTokens.length > 0) {
      let totalScore = 0
      for (const qt of queryTokens) {
        // ... nested logic
      }
      return new SearchResult(...)
    } else {
      return null
    }
  }
}
```

### Rule: Use instanceof for type guards instead of typeof

```typescript
// ✅ CORRECT: Works with classes and Data types
if (match instanceof BindingGroup) {
  navigateTo(match)
} else if (match instanceof BindingLeaf) {
  executeLeaf(match)
}

// ✅ CORRECT: Works with Tagged Enums
match._tag === "SetQuery"
match._tag === "SelectItem"

// ❌ AVOID: typeof for custom types (doesn't work)
if (typeof match === "object" && match.bindings) { ... }  // Fragile
```

---

## 7. Effect Style

### Rule: Use Effect.gen for complex async logic

```typescript
// ✅ CORRECT: Readable, sequential-looking code
const show = (menuId?: string) =>
  Effect.gen(function* () {
    const config = vscode.workspace.getConfiguration("kms")
    const rootBindings = parseBindings(config.get("bindings"))
    
    yield* contextService.set("kms.active", true)
    yield* contextService.flushNow
    
    // ... more operations
  })

// ✅ CORRECT: Can use imperative-style loops
Effect.gen(function* () {
  for (const cmd of commands) {
    const result = scoreMatch(query, cmd)
    if (result !== null) {
      results.push(result)
    }
  }
  return results
})
```

### Rule: Use pipe for simple transformations

```typescript
// ✅ CORRECT: For data transformations
results.sort((a, b) => b.score - a.score)
return results as readonly SearchResult[]

// ✅ CORRECT: When adding single operation
version: Ref.get(ref).pipe(Effect.map((s) => s.version))

// ✅ CORRECT: For adding observability
.pipe(Effect.withSpan("SearchService.search"))

// ⚠️ MIXED: Gen is better for multi-step logic, pipe for single ops
```

### Rule: Use Effect.runSync only for pure or sync effects

```typescript
// ✅ CORRECT: Sync effect in pure function
Effect.runSync(Ref.update(ref, (snap) => new ConfigSnapshot(...)))

// ✅ CORRECT: Tests (Effect.gen with mocked dependencies)
const result = Effect.runSync(
  eff.pipe(Effect.provide(MyServiceMock))
)

// ❌ AVOID: Using runSync for promises/async
const data = Effect.runSync(Effect.promise(() => fetch(url)))  // Will crash
```

---

## 8. Comments & Documentation

### Rule: Comment the "why", not the "what"

```typescript
// ✅ CORRECT: Explains design decision
// We detect backspace by checking if the value becomes empty
// while inside a submenu (stack.length > 0).
// This avoids triggering goBack when just clearing the input.
let ignoreNextEmpty = false

// ✅ CORRECT: Explains non-obvious algorithm detail
// Posting lists are already sorted by docId because we iterate commands in order
const sortedTokens = Array.from(postings.keys()).sort()

// ❌ AVOID: Stating what code already says
const cacheKey = `${version}:${query}`  // Create cache key
const match = currentNodes.find((n) => n.key === key)  // Find matching node

// ❌ AVOID: Outdated comments (remove if they diverge from code)
// TODO: Implement caching  // <- If caching is already implemented
```

### Rule: Use section separators before non-obvious logic

```typescript
// ✅ CORRECT: Clear intent
// Min-Heap for top-K selection
export class MinHeap { ... }

// Tokenize (pure, exported for testing)
export const tokenize = (text: string): readonly string[] => { ... }

// ---------------------------------------------------------------------------
// Inverted Index – pure data structure for fast full-text search
// ---------------------------------------------------------------------------
```

### Rule: JSDoc for public functions and services

```typescript
// ✅ CORRECT: Explains parameters and return type
/**
 * Builds an inverted index from a list of commands.
 * 
 * @param commands - Array of { id: string, label: string } objects
 * @returns An inverted index structure with documents, postings, and metadata
 */
export const buildIndex = (
  commands: { id: string; label: string }[]
): InvertedIndex => { ... }

/**
 * Scores a query against a command.
 * 
 * Scoring rules:
 * - Exact token match: 1.0
 * - Token prefix: 0.7
 * - Token substring: 0.4
 * - No match: null (filtered out)
 * 
 * @param query - User input
 * @param command - Command to score
 * @returns SearchResult if match found, null otherwise
 */
export const scoreMatch = (query: string, command: Command): SearchResult | null => { ... }
```

---

## 9. String Formatting

### Rule: Use template literals for multi-part strings

```typescript
// ✅ CORRECT: Clear and readable
const cacheKey = `${version}:${query}`
const breadcrumb = stack.map((s) => s.title).concat(currentTitle).join(" › ")
const label = `$(key) ${result.command.label}`

// ❌ AVOID: String concatenation
const cacheKey = version + ":" + query
const label = "$(key) " + result.command.label

// ❌ AVOID: Unnecessary template literals
const simple = `hello`  // Just use "hello"
```

---

## 10. Error Handling

### Rule: Always wrap external APIs with Error boundary

```typescript
// ✅ CORRECT: Errors are typed and catchable
export const fromVscode = <A>(
  op: string,
  f: () => Thenable<A>
): Effect.Effect<A, VscodeError> =>
  Effect.tryPromise({
    try: () => f() as Promise<A>,
    catch: (cause) => new VscodeError({ op, cause }),
  })

// ✅ CORRECT: Use in service
const execCommand = (command: string, ...args: readonly unknown[]) =>
  fromVscode("executeCommand", () =>
    vscode.commands.executeCommand(command, ...args)
  )

// ❌ AVOID: Unhandled errors
const data = vscode.commands.executeCommand(cmd)  // Might throw
```

### Rule: Log errors for debugging, but don't swallow

```typescript
// ✅ CORRECT: Log and continue
Effect.runPromise(commandService.execute(...))
  .catch((e) => console.error("[KMS] Command error:", e))

// ✅ CORRECT: Log structured errors
console.error("[KMS] Cleanup error:", e)

// ❌ AVOID: Silent failures
.catch(() => {})  // Hides bugs

// ❌ AVOID: Generic error messages
.catch((e) => console.error(e))  // No context
```

---

## 11. Testing Conventions

### Rule: Test names are complete sentences

```typescript
// ✅ CORRECT: Describes exactly what is tested
it("returns all commands on empty query", () => { ... })
it("matches exact token with score 1.0", () => { ... })
it("scores exact token higher than prefix", () => { ... })
it("finds registered commands by label", () => { ... })

// ❌ AVOID: Abbreviations or unclear names
it("empty query", () => { ... })
it("exact match", () => { ... })
it("scoring", () => { ... })
```

### Rule: Use factories for test data

```typescript
// ✅ CORRECT: Reusable, clear intent
const makeCommand = (label: string, id?: string) =>
  new Command({
    id: CommandId(id ?? `test.${label.toLowerCase().replace(/\s/g, "")}`),
    label,
    description: undefined,
    category: undefined,
    keybinding: undefined,
    when: undefined,
  })

// Usage:
it("matches format", () => {
  const cmd = makeCommand("Format Document")
  expect(scoreMatch("format", cmd)).not.toBeNull()
})

// ❌ AVOID: Inline test data
it("matches format", () => {
  const cmd = new Command({
    id: CommandId("test.formatdocument"),
    label: "Format Document",
    description: undefined,
    category: undefined,
    keybinding: undefined,
    when: undefined,
  })
})
```

### Rule: Test pure functions separately from Effect services

```typescript
// ✅ CORRECT: Pure function test (no Effect machinery)
describe("scoreMatch", () => {
  it("scores exact match highest", () => {
    const result = scoreMatch("format", makeCommand("Format Document"))
    expect(result!.score).toBeCloseTo(1.0)
  })
})

// ✅ CORRECT: Service test (uses Effect layer)
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

---

## 12. Whitespace & Formatting

### Rule: Use consistent spacing

```typescript
// ✅ CORRECT: Consistent spacing around operators
const x = a + b
const items = results.map(toRenderItem)
const stack: { title: string; nodes: readonly BindingNode[] }[] = []

// ✅ CORRECT: Blank lines between logical sections
const pendingRef = yield* Ref.make(new Map())
const currentRef = yield* Ref.make(new Map())

const flushNow = Effect.gen(function* () {
  // ...
})

return {
  set: (...) => { ... },
  flushNow,
}

// ❌ AVOID: Random spacing
const x=a+b
const items=results.map(toRenderItem)

// ❌ AVOID: No spacing between sections
const x = 1
const y = 2
const fn = () => {}
return {}
```

### Rule: Keep lines under 100 characters when possible

Most lines in KMS are 60–80 characters. Long lines are acceptable for:
- Method signatures (type info is important)
- String literals or template literals
- URLs or identifiers

---

## Summary Checklist

When writing code for KMS:

- [ ] Organize file into logical sections with `// -----------` separators
- [ ] Import in order: external, domain, services, utilities
- [ ] Use `Data.Class` for value objects, `Brand` for IDs, `TaggedEnum` for unions
- [ ] Mark all fields `readonly`, use `readonly` arrays
- [ ] Name variables descriptively: `camelCase`, constants `UPPER_SNAKE_CASE`
- [ ] Use `is/has/can/should` prefix for booleans
- [ ] Order functions by abstraction level (helpers → logic → service → layer)
- [ ] Prefer early returns over nested ifs
- [ ] Use `instanceof` for type guards
- [ ] Use `Effect.gen` for complex logic, `pipe` for simple transforms
- [ ] Comment the "why", not the "what"
- [ ] Use JSDoc for public APIs
- [ ] Wrap external APIs with `Effect.tryPromise`
- [ ] Test pure functions separately from Effect services
- [ ] Use test factories for common test data
- [ ] Keep test names as complete sentences
- [ ] Maintain consistent spacing and formatting

